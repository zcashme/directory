import secrets
import hashlib
import os
from decimal import Decimal
from datetime import datetime, timedelta, timezone
import re

from core.supabase_client import get_client
from core import zcash_runner as zr
from core.zcash_runner import log_event
from core.zcash_rpc import ZcashRPC, text_to_memo_hex


DEFAULT_OTP_AMOUNT_ZEC = "0.0005"
DEFAULT_OTP_AUTO_SEND = "true"


def _build_otp_memo(otp: str, expires_at: str) -> str:
    return f"OTP:{otp} EXPIRES:{expires_at}"

def _parse_txid_from_stdout(stdout: str | None) -> str | None:
    if not stdout:
        return None
    lines = [ln.strip() for ln in stdout.splitlines() if ln.strip()]
    if not lines:
        return None
    last = lines[-1]
    if re.fullmatch(r"[0-9a-f]{64}", last):
        return last
    return None

def _send_otp_transaction(
    to_address: str,
    amount_zec: str,
    memo: str,
    timeout: int = 180,
    sync_before_send: bool = True,
):
    wallet_dir = os.getenv("WALLET_DIR")
    account_id = os.getenv("ADMIN_ACCOUNT_ID")
    identity = os.getenv("ADMIN_IDENTITY")

    if not wallet_dir:
        raise RuntimeError("WALLET_DIR not set in environment")
    if not account_id:
        raise RuntimeError("ADMIN_ACCOUNT_ID not set in environment")

    if sync_before_send:
        sync_result = zr.sync_wallet()
        if sync_result.get("returncode") != 0:
            raise RuntimeError(sync_result.get("stderr") or sync_result.get("stdout"))

        enhance_result = zr.enhance_wallet()
        if enhance_result.get("returncode") != 0:
            raise RuntimeError(enhance_result.get("stderr") or enhance_result.get("stdout"))

    zr.ensure_funds(min_zec=float(amount_zec) * 2)

    value_zat = int(Decimal(amount_zec) * Decimal(10**8))

    args = ["send", account_id]
    if identity:
        args += ["-i", identity]

    args += [
        "--address", to_address,
        "--value", str(value_zat),
        "--memo", memo,
        "--server", zr.SERVER_TOKEN,
    ]

    return zr.run_command(args, timeout=timeout)

def _send_otp_transaction_rpc(
    to_address: str,
    amount_zec: str,
    memo: str,
    from_address: str,
):
    if not from_address:
        raise RuntimeError("ADMIN_ADDRESS_INBOX not set in environment")

    value_zec = float(Decimal(amount_zec))
    memo_hex = text_to_memo_hex(memo)
    outputs = [{
        "address": to_address,
        "amount": value_zec,
        "memo": memo_hex,
    }]

    rpc = ZcashRPC()
    opid = rpc.send_many(from_address, outputs, minconf=1)
    return {"returncode": 0, "stdout": str(opid), "stderr": "", "opid": opid}


def create_and_send_otp(
    zcasher_id: int,
    to_address: str = None,
    sync_before_send: bool = True,
    send_mode: str = "devtool",
    phase_callback=None,
):
    """
    Phase III (manual-send version):
    - One row per user (PRIMARY KEY = zcasher_id)
    - UPSERT replaces the entire row
    - Creates fresh OTP every time
    """

    sb = get_client()
    now = datetime.now(timezone.utc).replace(microsecond=0)

    log_event(zcasher_id, "otp_create", "ok",
              f"Starting OTP creation for {zcasher_id}")
    if phase_callback:
        try:
            phase_callback("creating", {"zcasher_id": zcasher_id})
        except Exception:
            pass

    # ------------------------------------------------------------
    # 1. Resolve to_address if missing
    # ------------------------------------------------------------
    if not to_address:
        result = (
            sb.table("zcasher")
            .select("address")
            .eq("id", zcasher_id)
            .limit(1)
            .execute()
        )
        data = getattr(result, "data", None) or []
        if not data:
            log_event(
                zcasher_id, "otp_create_error", "error",
                f"No address found for zcasher_id={zcasher_id}"
            )
            raise ValueError(f"No address found for zcasher_id={zcasher_id}")

        to_address = data[0]["address"]

    # ------------------------------------------------------------
    # 2. Generate OTP
    # ------------------------------------------------------------
    otp = str(secrets.randbelow(1_000_000)).zfill(6)
    code_hash = hashlib.sha256(otp.encode()).hexdigest()

    expires_at = (now + timedelta(hours=120)).isoformat()
    created_at = now.isoformat()

    # ------------------------------------------------------------
    # 3. UPSERT new OTP record (overwrite old one)
    # ------------------------------------------------------------
    try:
        sb.table("verification_codes").upsert({
            "zcasher_id": zcasher_id,
            "code_hash": code_hash,
            "otp": otp,
            "expires_at": expires_at,
            "created_at": created_at,
            "attempts_left": 3,
            "is_verified": False,
            "otp_send_success": None,
            "otp_send_txid": None,
        }).execute()

        log_event(zcasher_id, "otp_store", "ok", "Stored new OTP")
        if phase_callback:
            try:
                phase_callback("stored", {"zcasher_id": zcasher_id})
            except Exception:
                pass

    except Exception as e:
        log_event(zcasher_id, "otp_store_error", "error", str(e))
        raise ValueError(f"Failed to generate OTP: {e}")

    # ------------------------------------------------------------
    # 4. Send OTP memo via zcash-devtool (optional)
    # ------------------------------------------------------------
    auto_send_raw = os.getenv("OTP_AUTO_SEND", DEFAULT_OTP_AUTO_SEND).strip().lower()
    auto_send = auto_send_raw in ("1", "true", "yes", "y", "on")
    amount_zec = os.getenv("OTP_AMOUNT_ZEC", DEFAULT_OTP_AMOUNT_ZEC)
    memo = _build_otp_memo(otp, expires_at)

    send_result = None
    status = "skipped"
    if auto_send:
        log_event(zcasher_id, "otp_send_start", "ok", f"Sending OTP to {to_address} via {send_mode}")
        if phase_callback:
            try:
                phase_callback("sending", {"zcasher_id": zcasher_id})
            except Exception:
                pass
        try:
            if send_mode == "rpc":
                from_address = os.getenv("ADMIN_ADDRESS_INBOX")
                send_result = _send_otp_transaction_rpc(
                    to_address,
                    amount_zec,
                    memo,
                    from_address,
                )
            else:
                send_result = _send_otp_transaction(
                    to_address,
                    amount_zec,
                    memo,
                    sync_before_send=sync_before_send,
                )
        except Exception as e:
            log_event(zcasher_id, "otp_send_error", "error", str(e))
            sb.table("verification_codes").update(
                {
                    "otp_send_success": False,
                    "otp_send_txid": None,
                }
            ).eq("zcasher_id", zcasher_id).execute()
            raise

        status = "ok" if send_result.get("returncode") == 0 else "error"
        if send_mode == "rpc":
            # We store opid for now; polling for the txid adds latency/complexity.
            txid = send_result.get("opid") or send_result.get("stdout")
        else:
            txid = _parse_txid_from_stdout(send_result.get("stdout"))
        send_success = status == "ok"
        message = send_result.get("stderr") or send_result.get("stdout") or ""
        log_event(zcasher_id, "otp_send", status, message)
        if phase_callback:
            try:
                phase_callback("sent" if send_success else "failed", {"zcasher_id": zcasher_id})
            except Exception:
                pass

        sb.table("verification_codes").update(
            {
                "otp_send_success": send_success,
                "otp_send_txid": txid,
            }
        ).eq("zcasher_id", zcasher_id).execute()
    else:
        log_event(zcasher_id, "otp_ready_manual_send", "ok",
                  f"OTP ready for manual send to {to_address}")

    if auto_send:
        final_status = "otp_sent" if status == "ok" else "otp_send_failed"
    else:
        final_status = "otp_generated"

    return {
        "status": final_status,
        "zcasher_id": zcasher_id,
        "otp": otp,
        "send_to_address": to_address,
        "expires_at": expires_at,
        "created_at": created_at,
        "send_result": send_result,
    }
