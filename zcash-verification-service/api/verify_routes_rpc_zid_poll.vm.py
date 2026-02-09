# NOTE: Reference copy pulled from VM:
# /home/zecviewkey/zvs/zcash-verification-service/api/verify_routes_rpc_zid_poll.py
# (pulled locally via scp for diffing)
import os
import json
import time
import re
import hashlib
import uuid
import threading
import secrets
from datetime import datetime, timezone
from api.otp_service import create_and_send_otp
from fastapi import FastAPI, HTTPException

# Routers
from api.admin_routes import router as admin_router

from core.supabase_client import get_client
from core.zcash_runner import (
    parse_and_store_transactions,
    log_event,
)
from core.zcash_rpc import ZcashRPC, decode_memo_hex

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Zcash Verification API")

# --- CORS SETTINGS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "https://zcash.me",
        "https://www.zcash.me",
        "https://verify.zcash.me",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount admin routes
app.include_router(admin_router, prefix="/admin")

POLL_REQUESTS_TABLE = os.getenv("POLL_REQUESTS_TABLE", "verification_poll_requests")
# Polling path should be as lean as possible.
RPC_POLL_DIAGNOSTICS = False


@app.get("/debug/zcashers")
def debug_zcashers():
    sb = get_client()
    rows = sb.table("zcasher").select("id, name, address").execute()
    return rows.data


@app.get("/")
def root():
    return {"status": "ok", "service": "zcash-verification"}


def _parse_iso(dt_raw: str | None):
    if not dt_raw:
        return None
    clean = dt_raw.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(clean)
    except Exception:
        return None


def _get_last_otp_status(sb, zcasher_id: int):
    result = (
        sb.table("verification_codes")
        .select("created_at, otp_send_success")
        .eq("zcasher_id", zcasher_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    rows = getattr(result, "data", None) or []
    if not rows:
        return None, None
    row = rows[0]
    return _parse_iso(row.get("created_at")), row.get("otp_send_success")


def _collect_new_verification_requests(sb, run_start_iso: str):
    result = (
        sb.table("transactions")
        .select("txid, zid, tx_time, ts, memo, tx_ignore")
        .gte("ts", run_start_iso)
        .execute()
    )
    rows = getattr(result, "data", None) or []
    candidates = {}
    for row in rows:
        if row.get("tx_ignore"):
            continue
        zid_raw = row.get("zid")
        if zid_raw is None:
            continue
        try:
            zid = int(zid_raw)
        except Exception:
            continue
        tx_time = _parse_iso(row.get("tx_time"))
        if not tx_time:
            continue
        existing = candidates.get(zid)
        if not existing or tx_time > existing["tx_time"]:
            candidates[zid] = {
                "zid": zid,
                "txid": row.get("txid"),
                "tx_time": tx_time,
                "memo": row.get("memo"),
            }
    return list(candidates.values())


def _fast_match_receipt(
    receipts,
    zid: int,
    request_id: str,
    ignore_txids: set[str] | None = None,
):
    zid_tag = f"{{z:{zid}"
    rid_tag = f"rid:{request_id}"
    ignore_txids = ignore_txids or set()
    # Newest-first scan over a small tail of receipts.
    for r in reversed(receipts):
        txid = r.get("txid")
        if txid and txid in ignore_txids:
            continue
        memo_text = decode_memo_hex(r.get("memo"))
        if not memo_text or zid_tag not in memo_text or rid_tag not in memo_text:
            continue
        now_utc = datetime.now(timezone.utc)
        return {
            "zid": zid,
            "txid": txid,
            "tx_time": now_utc,
            "ts": now_utc,
            "event_time": now_utc,
            "memo": memo_text,
            "raw_receipt": dict(r),
        }
    return None


def _rpc_receipts_to_devtool_output(receipts, rpc: ZcashRPC) -> str:
    lines = []
    for r in receipts:
        txid = r.get("txid")
        if not txid:
            continue

        memo_text = decode_memo_hex(r.get("memo"))
        height_raw = r.get("blockheight")
        height = None
        if height_raw is not None:
            try:
                height = int(height_raw)
            except Exception:
                height = None

        mined = None
        if height is not None:
            try:
                block_hash = rpc.get_block_hash(height)
                header = rpc.get_block_header(block_hash)
                block_time = header.get("time")
                if block_time:
                    dt = datetime.fromtimestamp(block_time, tz=timezone.utc)
                    mined = dt.strftime("%Y-%m-%d %H:%M:%S+00:00")
            except Exception:
                mined = None

        lines.append(txid)
        if height is not None:
            if mined:
                lines.append(f"Mined: {height} ({mined})")
            else:
                lines.append(f"Mined: {height}")
        if memo_text:
            escaped = memo_text.replace("\\", "\\\\").replace('"', '\\"')
            lines.append(f'Memo::Text("{escaped}")')
        lines.append("")

    return "\n".join(lines)


def _get_cached_receipts(rpc: ZcashRPC, admin_inbox: str, zid: int):
    print(
        "[rpc_call_start] "
        f"zid={zid} method=z_listreceivedbyaddress "
        f"url={rpc.url} timeout_s={rpc.timeout} minconf=0 inbox={admin_inbox}"
    )
    t0 = time.perf_counter()
    receipts = rpc.list_received_by_address(admin_inbox, 0)
    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    print(
        "[rpc_call_done] "
        f"zid={zid} z_listreceivedbyaddress in {elapsed_ms} ms receipts={len(receipts)}"
    )
    return receipts, False




def _log_rpc_ingest(receipts, sb) -> None:
    if not receipts:
        return
    for r in receipts:
        txid = r.get("txid")
        if not txid:
            continue
        memo_hex = r.get("memo")
        memo_text = decode_memo_hex(memo_hex)
        try:
            sb.table("transaction_ingest_log").insert({
                "txid": txid,
                "source": "rpc",
                "memo_raw": memo_hex,
                "memo_norm": memo_text,
                "raw_payload": dict(r),
            }).execute()
        except Exception as e:
            print(f"Failed to log rpc ingest for tx {txid}: {e}")


def _print_last_blocks(raw_output: str, label: str, count: int = 10) -> None:
    blocks = re.split(r"(?=^[0-9a-f]{64}$)", raw_output, flags=re.MULTILINE)
    blocks = [b.strip() for b in blocks if b.strip()]
    if not blocks:
        print(f"\n[{label}] No tx blocks found.")
        return
    tail = blocks[-count:]
    print(f"\n[{label}] Last {len(tail)} tx blocks (devtool-like):\n")
    for block in tail:
        print(block)
        print("")


def _extract_rpc_error(entries) -> str | None:
    if not entries:
        return None
    for entry in entries:
        if entry.get("status") == "failed":
            err = entry.get("error") or {}
            if isinstance(err, dict):
                msg = err.get("message") or str(err)
            else:
                msg = str(err)
            return msg
    return None


def _rpc_debug_operation(opid: str | None, rpc: ZcashRPC, zcasher_id: int | None) -> None:
    if not opid:
        log_event(zcasher_id, "otp_send_rpc_debug_skip", "error", "missing opid")
        return
    try:
        status_entries = []
        result_entries = []
        for _ in range(5):
            status_entries = rpc.get_operation_status([opid])
            result_entries = rpc.get_operation_result([opid])
            if result_entries or _extract_rpc_error(status_entries):
                break
            time.sleep(1)
        print(f"\n[RPC_DEBUG_OPS] opid={opid}")
        print(f"status={status_entries}")
        print(f"result={result_entries}")
        log_event(zcasher_id, "otp_send_rpc_status", "ok", json.dumps(status_entries, default=str))
        log_event(zcasher_id, "otp_send_rpc_result", "ok", json.dumps(result_entries, default=str))
        error_msg = _extract_rpc_error(result_entries) or _extract_rpc_error(status_entries)
        if error_msg:
            log_event(zcasher_id, "otp_send_rpc_failed", "error", f"opid={opid} error={error_msg}")
    except Exception as e:
        log_event(zcasher_id, "otp_send_rpc_debug_error", "error", str(e))


def _get_poll_request(sb, request_id: str):
    result = (
        sb.table(POLL_REQUESTS_TABLE)
        .select("*")
        .eq("id", request_id)
        .limit(1)
        .execute()
    )
    rows = getattr(result, "data", None) or []
    return rows[0] if rows else None


def _create_poll_request(sb, zid: int):
    alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    request_id = None
    for _ in range(10):
        candidate = "".join(secrets.choice(alphabet) for _ in range(6))
        try:
            existing = (
                sb.table(POLL_REQUESTS_TABLE)
                .select("id")
                .eq("id", candidate)
                .limit(1)
                .execute()
            )
            rows = getattr(existing, "data", None) or []
            if rows:
                continue
        except Exception:
            # If the collision check fails, fall back to the candidate id.
            pass
        request_id = candidate
        break
    if request_id is None:
        request_id = "".join(secrets.choice(alphabet) for _ in range(6))
    started_at = datetime.utcnow().isoformat() + "Z"
    payload = {
        "id": request_id,
        "zid": zid,
        "status": "pending",
        "started_at": started_at,
        "created_at": started_at,
    }
    sb.table(POLL_REQUESTS_TABLE).insert(payload).execute()
    return request_id, started_at


def _update_poll_request(sb, request_id: str, updates: dict) -> None:
    sb.table(POLL_REQUESTS_TABLE).update(updates).eq("id", request_id).execute()


def _get_last_matched_txid(sb, zid: int) -> str | None:
    try:
        result = (
            sb.table(POLL_REQUESTS_TABLE)
            .select("matched_txid, matched_at")
            .eq("zid", zid)
            .eq("status", "matched")
            .not_.is_("matched_txid", "null")
            .order("matched_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = getattr(result, "data", None) or []
        if not rows:
            return None
        return rows[0].get("matched_txid")
    except Exception as e:
        print(f"[last_matched_txid_error] zid={zid} error={e}")
        return None


def _get_seen_txids(sb, txids: list[str]) -> set[str]:
    if not txids:
        return set()
    try:
        result = (
            sb.table("transactions")
            .select("txid")
            .in_("txid", txids)
            .execute()
        )
        rows = getattr(result, "data", None) or []
        return {r.get("txid") for r in rows if r.get("txid")}
    except Exception as e:
        print(f"[seen_txids_error] error={e}")
        return set()


def _append_otp_phase(request_id: str, phase: str) -> None:
    sb = get_client()
    req = _get_poll_request(sb, request_id)
    if not req:
        return
    history = req.get("otp_phase_history") or []
    if not isinstance(history, list):
        history = []
    history.append(
        {
            "phase": phase,
            "ts": datetime.now(timezone.utc).isoformat(),
        }
    )
    try:
        _update_poll_request(
            sb,
            request_id,
            {
                "otp_phase": phase,
                "otp_phase_history": history,
            },
        )
    except Exception as e:
        log_event(req.get("zid"), "otp_phase_update_error", "error", str(e))


def _start_otp_async(request_id: str, zid: int) -> None:
    def _runner():
        def _phase_cb(phase: str, _meta: dict):
            _append_otp_phase(request_id, phase)

        try:
            result = create_and_send_otp(
                zid,
                sync_before_send=False,
                send_mode="rpc",
                phase_callback=_phase_cb,
            )
            otp_status = result.get("status")
            _update_poll_request(
                get_client(),
                request_id,
                {
                    "otp_status": otp_status,
                },
            )
        except Exception as e:
            _append_otp_phase(request_id, "failed")
            log_event(zid, "otp_async_error", "error", str(e))

    thread = threading.Thread(target=_runner, daemon=True)
    thread.start()


def _parse_store_matched_receipts(matched_receipts) -> int:
    if not matched_receipts:
        return 0
    try:
        sb = get_client()
        rpc = ZcashRPC()
        rpc_stdout = _rpc_receipts_to_devtool_output(matched_receipts, rpc)
        return parse_and_store_transactions(rpc_stdout, sb, source="rpc")
    except Exception as e:
        print(f"[parse_store_error] error={e}")
        return 0


@app.post("/verify/poll/start")
def verify_poll_start(zid: int):
    sb = get_client()
    request_id, started_at = _create_poll_request(sb, zid)
    return {
        "status": "pending",
        "request_id": request_id,
        "started_at": started_at,
        "zid": zid,
    }


@app.get("/verify/poll/{request_id}/status")
def verify_poll_status(request_id: str, debug_ops: bool = False):
    sb = get_client()
    req = _get_poll_request(sb, request_id)
    if not req:
        raise HTTPException(404, "Verification poll request not found")

    if req.get("status") and req.get("status") != "pending":
        return {
            "status": req.get("status"),
            "request_id": request_id,
            "zid": req.get("zid"),
            "matched_txid": req.get("matched_txid"),
            "matched_memo": req.get("matched_memo"),
            "otp_status": req.get("otp_status"),
            "otp_phase": req.get("otp_phase"),
            "otp_phase_history": req.get("otp_phase_history") or [],
        }

    zid_raw = req.get("zid")
    if zid_raw is None:
        raise HTTPException(500, "Poll request missing zid")
    try:
        zid = int(zid_raw)
    except Exception:
        raise HTTPException(500, "Poll request has invalid zid")

    run_start_iso = req.get("started_at") or req.get("created_at")
    if not run_start_iso:
        run_start_iso = datetime.utcnow().isoformat() + "Z"
    started_at_dt = _parse_iso(run_start_iso)

    admin_inbox = os.getenv("ZCASH_ADMIN_INBOX") or os.getenv("ADMIN_ADDRESS_INBOX")
    if not admin_inbox:
        raise HTTPException(500, "ZCASH_ADMIN_INBOX or ADMIN_ADDRESS_INBOX not set")

    now_utc = datetime.now(timezone.utc)
    started_at_str = started_at_dt.isoformat() if started_at_dt else "(unknown)"
    lag_s = None
    if started_at_dt:
        lag_s = max(0, int((now_utc - started_at_dt).total_seconds()))
    print(
        "[wallet_rpc_poll_start] "
        f"request_id={request_id} zid={zid} started_at={started_at_str} "
        f"elapsed_since_start_s={(lag_s if lag_s is not None else '(unknown)')} "
        f"inbox={admin_inbox}"
    )
    rpc = ZcashRPC()
    try:
        receipts, from_cache = _get_cached_receipts(rpc, admin_inbox, zid)
    except Exception as e:
        print(f"[rpc_call_error] zid={zid} error={e}")
        return {
            "status": "pending",
            "request_id": request_id,
            "zid": zid,
            "rpc_error": str(e),
        }
    scan_receipts = receipts
    print(
        "[rpc_scan] "
        f"request_id={request_id} zid={zid} scan_size={len(scan_receipts)} "
        f"total_receipts={len(receipts)}"
    )
    ignore_txids: set[str] = set()
    last_txid = _get_last_matched_txid(sb, zid)
    if last_txid:
        ignore_txids.add(last_txid)
        print(f"[ignore_last_matched_txid] zid={zid} txid={last_txid}")
    req_txid = req.get("matched_txid")
    if req_txid:
        ignore_txids.add(req_txid)
    scan_txids = [r.get("txid") for r in scan_receipts if r.get("txid")]
    seen_txids = _get_seen_txids(sb, scan_txids)
    if seen_txids:
        ignore_txids.update(seen_txids)
        print(f"[ignore_seen_txids] zid={zid} count={len(seen_txids)}")
    fast_match = _fast_match_receipt(
        scan_receipts,
        zid,
        request_id,
        ignore_txids=ignore_txids,
    )
    eligible = []
    if fast_match:
        matched_txid = fast_match.get("txid")
        matched_memo = fast_match.get("memo") or ""
        print(
            "[fast_match_found] "
            f"request_id={request_id} zid={zid} txid={matched_txid}"
        )
        print(f"[fast_match_memo_full] txid={matched_txid} memo={matched_memo}")
        matched_receipts = [r for r in scan_receipts if r.get("txid") == matched_txid]
        print(
            "[parse_store_start] "
            f"request_id={request_id} zid={zid} txid={matched_txid} receipts={len(matched_receipts)}"
        )
        stored = _parse_store_matched_receipts(matched_receipts)
        print(
            "[parse_store_done] "
            f"request_id={request_id} zid={zid} txid={matched_txid} stored={stored}"
        )
        last_otp_at, last_otp_send_success = _get_last_otp_status(sb, zid)
        event_time = fast_match.get("event_time")
        if last_otp_send_success is not False:
            if last_otp_at and event_time and event_time <= last_otp_at:
                print(
                    "[fast_match_ignored] "
                    f"request_id={request_id} zid={zid} reason=older-than-last-otp"
                )
            else:
                fast_match["last_otp_at"] = last_otp_at
                fast_match["last_otp_send_success"] = last_otp_send_success
                eligible.append(fast_match)
        else:
            fast_match["last_otp_at"] = last_otp_at
            fast_match["last_otp_send_success"] = last_otp_send_success
            eligible.append(fast_match)
    else:
        print(
            "[fast_match_miss] "
            f"request_id={request_id} zid={zid} receipts_checked={len(scan_receipts)}"
        )

    if not eligible:
        return {
            "status": "pending",
            "request_id": request_id,
            "zid": zid,
        }

    match_time = datetime.now(timezone.utc)
    zids = sorted({r["zid"] for r in eligible})
    zcasher_map = {}
    if zids:
        z_rows = (
            sb.table("zcasher")
            .select("id, name, display_name")
            .in_("id", zids)
            .execute()
        )
        for row in getattr(z_rows, "data", None) or []:
            zcasher_map[int(row["id"])] = row

    auto_send_raw = os.getenv("OTP_HITL", "true").strip().lower()
    hitl = auto_send_raw in ("1", "true", "yes", "y", "on")
    approved = True
    if hitl and debug_ops:
        response = input("Generate/send OTPs for these requests? [y/N]: ").strip().lower()
        approved = response in ("y", "yes")

    sent = []
    otp_phase = req.get("otp_phase")
    if approved and eligible and not otp_phase:
        _append_otp_phase(request_id, "creating")
        _start_otp_async(request_id, zid)
        otp_phase = "creating"

    matched = eligible[0]
    elapsed_seconds = None
    started_at_raw = req.get("started_at") or req.get("created_at")
    started_at = _parse_iso(started_at_raw) if started_at_raw else None
    if started_at:
        elapsed_seconds = max(0, int((match_time - started_at).total_seconds()))
    update_payload = {
        "status": "matched",
        "matched_txid": matched.get("txid"),
        "matched_memo": matched.get("memo"),
        "matched_at": match_time.isoformat(),
        "otp_status": req.get("otp_status"),
    }
    if elapsed_seconds is not None:
        update_payload["elapsed_seconds"] = elapsed_seconds
    _update_poll_request(sb, request_id, update_payload)
    if elapsed_seconds is not None:
        try:
            sb.table("verification_codes").update(
                {"verification_elapsed_seconds": elapsed_seconds}
            ).eq("zcasher_id", zid).execute()
        except Exception as e:
            log_event(zid, "verify_elapsed_update_error", "error", str(e))

    return {
        "status": "matched",
        "request_id": request_id,
        "zid": zid,
        "matched_txid": update_payload["matched_txid"],
        "otp_sent": sent,
        "otp_phase": otp_phase,
        "otp_phase_history": (_get_poll_request(sb, request_id) or {}).get("otp_phase_history") or [],
    }


@app.post("/verify/check")
def verify_check(zid: int, debug_ops: bool = False):
    sb = get_client()
    run_start_iso = datetime.utcnow().isoformat() + "Z"

    # RPC scan + adapter to devtool-like output
    admin_inbox = os.getenv("ZCASH_ADMIN_INBOX") or os.getenv("ADMIN_ADDRESS_INBOX")
    if not admin_inbox:
        raise HTTPException(500, "ZCASH_ADMIN_INBOX or ADMIN_ADDRESS_INBOX not set")

    log_event(None, "wallet_rpc_scan_start", "ok", f"Scanning inbox {admin_inbox}")
    rpc = ZcashRPC()
    receipts = rpc.list_received_by_address(admin_inbox, 0)
    rpc_stdout = _rpc_receipts_to_devtool_output(receipts, rpc)
    _log_rpc_ingest(receipts, sb)

    # Optional debug: dump reconstructed output
    dump_txid = os.getenv("RPC_DUMP_TXID", "").strip().lower()
    dump_all = os.getenv("RPC_DUMP_ALL", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "y",
        "on",
    )
    if dump_txid or dump_all:
        if dump_all:
            print("\n[RPC_DUMP_ALL] Reconstructed devtool-like output:\n")
            print(rpc_stdout)
        else:
            blocks = [b for b in rpc_stdout.split("\n\n") if b.strip().startswith(dump_txid)]
            print(f"\n[RPC_DUMP_TXID={dump_txid}] Reconstructed block:\n")
            print(blocks[0] if blocks else "txid not found in RPC output")

    _print_last_blocks(rpc_stdout, "RPC_SCAN_ADAPTED")
    count = parse_and_store_transactions(rpc_stdout, sb, source="rpc")
    log_event(None, "wallet_rpc_scan_done", "ok", f"Stored {count} memos via RPC")

    new_requests = _collect_new_verification_requests(sb, run_start_iso)
    eligible = []
    for req in new_requests:
        if req["zid"] != zid:
            continue
        last_otp_at, last_otp_send_success = _get_last_otp_status(sb, req["zid"])
        if last_otp_send_success is not False:
            if last_otp_at and req["tx_time"] <= last_otp_at:
                continue
        req["last_otp_at"] = last_otp_at
        req["last_otp_send_success"] = last_otp_send_success
        eligible.append(req)

    zids = sorted({r["zid"] for r in eligible})
    zcasher_map = {}
    if zids:
        z_rows = (
            sb.table("zcasher")
            .select("id, name, display_name")
            .in_("id", zids)
            .execute()
        )
        for row in getattr(z_rows, "data", None) or []:
            zcasher_map[int(row["id"])] = row

    auto_send_raw = os.getenv("OTP_HITL", "true").strip().lower()
    hitl = auto_send_raw in ("1", "true", "yes", "y", "on")
    approved = True
    if hitl and not eligible:
        print(f"\nNo pending verification requests matched zid={zid}.")
        log_event(None, "verify_check", "ok", f"No pending verification requests for zid={zid}")
    if hitl and eligible:
        print("\nThese are verification requests who did not receive verification codes yet.")
        print("Pending verification requests (tx_time newer than last OTP):")
        for item in eligible:
            zrow = zcasher_map.get(item["zid"]) or {}
            name = zrow.get("name") or ""
            display_name = zrow.get("display_name") or ""
            last_otp = item.get("last_otp_at")
            last_otp_str = last_otp.isoformat() if last_otp else "(none)"
            last_otp_send_success = item.get("last_otp_send_success")
            memo = item.get("memo") or ""
            print(
                "  "
                f"zid={item['zid']} | name={name} | display_name={display_name} | "
                f"tx_time={item['tx_time'].isoformat()} | last_otp={last_otp_str} | "
                f"last_otp_send_success={last_otp_send_success} | memo={memo}"
            )

        if eligible:
            print("\nPending verification requests (tx_ignore != True):")
            for item in eligible:
                zrow = zcasher_map.get(item["zid"]) or {}
                name = zrow.get("name") or ""
                display_name = zrow.get("display_name") or ""
                last_otp = item.get("last_otp_at")
                last_otp_str = last_otp.isoformat() if last_otp else "(none)"
                last_otp_send_success = item.get("last_otp_send_success")
                memo = item.get("memo") or ""
                print(
                    "  "
                    f"zid={item['zid']} | name={name} | display_name={display_name} | "
                    f"tx_time={item['tx_time'].isoformat()} | last_otp={last_otp_str} | "
                    f"last_otp_send_success={last_otp_send_success} | memo={memo}"
                )

        if debug_ops:
            response = input("Generate/send OTPs for these requests? [y/N]: ").strip().lower()
            approved = response in ("y", "yes")

    sent = []
    if approved and eligible:
        for item in eligible:
            try:
                r = create_and_send_otp(
                    item["zid"],
                    sync_before_send=False,
                    send_mode="rpc",
                )
                zrow = zcasher_map.get(item["zid"]) or {}
                name = zrow.get("name") or ""
                display_name = zrow.get("display_name") or ""
                status = r.get("status")
                send_result = r.get("send_result") or {}
                if debug_ops:
                    _rpc_debug_operation(send_result.get("opid") or send_result.get("stdout"), rpc, item["zid"])
                print(
                    f"OTP send status: zid={item['zid']} | name={name} | "
                    f"display_name={display_name} | status={status}"
                )
                sent.append({
                    "zid": item["zid"],
                    "status": status,
                })
            except Exception as e:
                zrow = zcasher_map.get(item["zid"]) or {}
                name = zrow.get("name") or ""
                display_name = zrow.get("display_name") or ""
                print(
                    f"OTP send status: zid={item['zid']} | name={name} | "
                    f"display_name={display_name} | status=error"
                )
                log_event(item["zid"], "otp_send_error", "error", str(e))

    if count > 0:
        log_event(None, "verify_check", "ok", f"{count} transactions with memos stored")
    else:
        log_event(None, "verify_check", "ok", "No memos with z-pattern found")

    return {
        "status": "message_received",
        "count": count,
        "scan_mode": "rpc",
        "otp_candidates": [c["zid"] for c in eligible],
        "otp_sent": sent,
        "otp_approved": approved,
    }


@app.post("/verify/confirm")
def verify_confirm(zcasher_id: int, otp: str):
    sb = get_client()

    supplied_hash = hashlib.sha256(otp.encode()).hexdigest()

    result = (
        sb.table("verification_codes")
        .select("*")
        .eq("zcasher_id", zcasher_id)
        .order("id", desc=True)
        .execute()
    )

    rows = getattr(result, "data", None) or []
    if not rows:
        raise HTTPException(404, f"No OTP record for zcasher_id {zcasher_id}")

    vc = rows[0]

    if len(rows) > 1:
        old_ids = [r["id"] for r in rows[1:] if not r.get("is_verified")]
        if old_ids:
            sb.table("verification_codes").update(
                {"expires_at": datetime.now(timezone.utc).isoformat()}
            ).in_("id", old_ids).execute()

    if vc.get("is_verified"):
        return {
            "status": "otp_already_used",
            "zcasher_id": zcasher_id,
        }

    attempts_left = vc.get("attempts_left", 0)
    if attempts_left <= 0:
        return {"status": "locked", "zcasher_id": zcasher_id}

    expires_raw = vc.get("expires_at", "")
    clean_expires = expires_raw.replace("Z", "+00:00")
    try:
        expires_at = datetime.fromisoformat(clean_expires)
    except Exception:
        raise HTTPException(500, f"Malformed expires_at: {expires_raw}")

    now_utc = datetime.now(timezone.utc)
    if now_utc > expires_at:
        return {"status": "expired", "zcasher_id": zcasher_id}

    if supplied_hash != vc.get("code_hash"):
        new_attempts = max(0, attempts_left - 1)
        sb.table("verification_codes").update(
            {"attempts_left": new_attempts}
        ).eq("id", vc["id"]).execute()

        log_event(zcasher_id, "verify_invalid_otp", "fail", f"Attempts left: {new_attempts}")

        return {
            "status": "invalid",
            "attempts_left": new_attempts,
            "zcasher_id": zcasher_id,
        }

    sb.table("verification_codes").update(
        {"is_verified": True}
    ).eq("id", vc["id"]).execute()

    sb.table("zcasher").update(
        {"address_verified": True, "last_verified_at": now_utc.isoformat()}
    ).eq("id", zcasher_id).execute()

    pending = (
        sb.table("pending_zcasher_edits")
        .select("*")
        .eq("zcasher_id", zcasher_id)
        .eq("processed", False)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    pending_rows = getattr(pending, "data", None) or []
    if not pending_rows:
        log_event(zcasher_id, "verify_confirm", "ok", "Verified: no pending edits")
        return {"status": "verified_and_no_pending_edits", "zcasher_id": zcasher_id}

    edit = pending_rows[0]

    profile_updates = {}
    profile = edit.get("profile") or {}

    delete_map = {
        "a": "address",
        "n": "name",
        "b": "bio",
        "i": "profile_image_url",
        "h": "display_name",
    }

    for code in profile.get("d", []):
        col = delete_map.get(code)
        if col:
            profile_updates[col] = None

    for key in ["name", "bio", "profile_image_url", "address", "display_name"]:
        if key in profile:
            profile_updates[key] = profile[key]

    if profile_updates:
        sb.table("zcasher").update(profile_updates).eq("id", zcasher_id).execute()

    from urllib.parse import urlparse

    def normalize_url(u: str) -> str:
        u = u.strip()
        if not u.startswith(("http://", "https://")):
            return "https://" + u
        return u

    def label_from_url(url: str) -> str:
        try:
            p = urlparse(url)
            if p.netloc:
                return p.netloc
            return url.split("/")[0]
        except Exception:
            return url

    for token in edit.get("links", []):
        token = str(token)

        if token.startswith("-"):
            try:
                sb.table("zcasher_links").delete().eq("id", int(token[1:])).execute()
            except Exception:
                continue

        elif token.startswith("+!"):
            url = normalize_url(token[2:])
            label = label_from_url(url)
            sb.table("zcasher_links").insert(
                {
                    "zcasher_id": zcasher_id,
                    "label": label,
                    "url": url,
                    "order_index": 0,
                    "is_verified": False,
                    "pending_verif": True,
                }
            ).execute()

        elif token.startswith("!"):
            lid = token[1:]
            sb.table("zcasher_links").update(
                {
                    "pending_verif": True,
                    "is_verified": False,
                }
            ).eq("id", lid).execute()

        elif token.startswith("+"):
            url = normalize_url(token[1:])
            label = label_from_url(url)
            sb.table("zcasher_links").insert(
                {
                    "zcasher_id": zcasher_id,
                    "label": label,
                    "url": url,
                    "order_index": 0,
                    "is_verified": False,
                    "pending_verif": False,
                }
            ).execute()

    sb.table("pending_zcasher_edits").update({"processed": True}).eq("id", edit["id"]).execute()

    log_event(zcasher_id, "verify_confirm", "ok", "OTP successfully applied")
    return {"status": "verified", "zcasher_id": zcasher_id}
