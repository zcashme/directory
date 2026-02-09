import os, subprocess, shlex, sys, re
from datetime import datetime
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

# --- Server resolution -------------------------------------------------------
# We only pass *server tokens* (e.g., "zecrocks") to the CLI.
# Env precedence:
#   1) ZCASH_SERVER_NAME   (expected values: zecrocks, ecc, test, main, etc.)
#   2) ZCASH_SERVER        (if it's a known token; URLs are ignored)
#   default: "zecrocks"
KNOWN_SERVER_TOKENS = {"zecrocks", "ecc", "main", "test"}

def _resolve_server_token() -> str:
    name = os.getenv("ZCASH_SERVER_NAME", "").strip().lower()
    if name in KNOWN_SERVER_TOKENS:
        return name
    # Back-compat: some envs had ZCASH_SERVER set to a token or a URL.
    raw = os.getenv("ZCASH_SERVER", "").strip().lower()
    if raw in KNOWN_SERVER_TOKENS:
        return raw
    # If ZCASH_SERVER looks like a URL/host:port, *do not* pass it to --server.
    # The current zcash-devtool build expects a token; URLs caused the breakage.
    return "zecrocks"

SERVER_TOKEN = _resolve_server_token()

# --- Supabase logging --------------------------------------------------------
from supabase import create_client, Client

def log_event(zid=None, action=None, status=None, message=None, meta=None):
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        print("Missing Supabase credentials, skipping log insert.")
        return
    supabase: Client = create_client(url, key)
    payload = {
        "zcasher_id": zid,
        "action": action,
        "status": status,
        "message": message,
        "meta": meta,
        "ts": datetime.utcnow().isoformat() + "Z",
    }
    try:
        supabase.table("devtool_logs").insert(payload).execute()
        print(f"✅ Logged event: {action} ({status})")
    except Exception as e:
        print(f"❌ Failed to log event: {e}")

# --- Runner ------------------------------------------------------------------
def run_command(args, timeout=60):
    """
    Execute zcash-devtool.exe exactly as in PowerShell:
      zcash-devtool.exe wallet --wallet-dir <dir> <args...>

    Streams output live for long-running ops like `sync`/`enhance`.
    """
    load_dotenv(find_dotenv())

    devtool_path = os.getenv("DEVTOOL_PATH")
    wallet_dir = os.getenv("WALLET_DIR")
    exe_path = os.path.join(devtool_path, "target", "release", "zcash-devtool.exe")

    if not os.path.exists(exe_path):
        raise FileNotFoundError(f"Executable not found: {exe_path}")
    if not os.path.exists(wallet_dir):
        raise FileNotFoundError(f"Wallet dir not found: {wallet_dir}")

    cmd = [exe_path, "wallet", "--wallet-dir", wallet_dir] + args
    print("🔧 Running:", " ".join(shlex.quote(c) for c in cmd))

    env = os.environ.copy()
    env["ZCASH_PARAMS_DIR"] = os.path.expandvars(r"%USERPROFILE%\.zcash-params")
    env["ZCASH_WALLET_DIR"] = wallet_dir

    long_running = any(x in args for x in ["sync", "enhance", "scan", "fetch"])

    if long_running:
        process = subprocess.Popen(
            cmd,
            cwd=os.path.dirname(exe_path),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            env=env,
            encoding="utf-8",
            errors="replace",
        )
        output = []
        print("📡 [Streaming live output...]\n")
        for line in process.stdout:
            ts = datetime.now().strftime("%H:%M:%S")
            formatted = f"[{ts}] {line}"
            sys.stdout.write(formatted)
            sys.stdout.flush()
            output.append(formatted)
        process.wait()
        print(f"\n✅ Completed with exit code {process.returncode}")
        return {"stdout": "".join(output), "stderr": "", "returncode": process.returncode}

    result = subprocess.run(
        cmd,
        cwd=os.path.dirname(exe_path),
        capture_output=True,
        text=True,
        timeout=timeout,
        shell=False,
        env=env,
        encoding="utf-8",
        errors="replace",
    )
    return {"stdout": result.stdout, "stderr": result.stderr, "returncode": result.returncode}

# --- High-level helpers ------------------------------------------------------
def sync_wallet(server: str | None = None):
    token = server or SERVER_TOKEN
    # Always pass a token (e.g., "zecrocks"), never a URL.
    result = run_command(["sync", "--server", token])
    log_event(
        None,
        "wallet_sync",
        "ok" if result["returncode"] == 0 else "error",
        result["stderr"] or result["stdout"],
        result,
    )
    return result

def enhance_wallet(server: str | None = None):
    token = server or SERVER_TOKEN
    result = run_command(["enhance", "--server", token])
    log_event(
        None,
        "wallet_enhance",
        "ok" if result["returncode"] == 0 else "error",
        result["stderr"] or result["stdout"],
        result,
    )
    return result

def scan_wallet():
    return run_command(["list-tx"])

def parse_memos(raw_output: str):
    """
    NEW VERSION:
    - Parse ALL transactions.
    - Do NOT drop any transactions.
    - Capture txid, memo text (even if unparsable), and zid if present.
    """

    txs = []
    current_tx = None

    for line in raw_output.splitlines():
        line = line.strip()

        # txid line
        if re.match(r"^[0-9a-f]{64}$", line):
            if current_tx:
                txs.append(current_tx)
            current_tx = {
                "txid": line,
                "memo": None,
                "zid": None,
            }
            continue

        # memo line
        if "Memo::Text" in line and current_tx:
            m = re.search(r'Memo::Text\("(.+)"\)', line)
            if m:
                memo_text = m.group(1)
                memo_text = memo_text.replace("\\\\", "\\").replace('\\"', '"')
                current_tx["memo"] = memo_text

                # Try to extract {z:###} if present
                zid_match = re.search(r"\{z:(\d+)", memo_text)
                if zid_match:
                    current_tx["zid"] = zid_match.group(1)

    if current_tx:
        txs.append(current_tx)

    return txs  # NEVER FILTER ANYMORE

def parse_and_store_transactions(raw_output: str, sb, source: str = "devtool"):
    """
    NEW VERSION:
    - Stores ALL transactions in public.transactions.
    - ALWAYS captures raw memo.
    - NEVER skips transactions when memo parsing fails.
    - Extracts pending edits only when a {z:...} memo is actually present.
    - Accurately captures tx_time from the 'Mined:' line.
    """

    import re
    from datetime import datetime

    memos = parse_memos(raw_output)
    upserts = 0
    pending_candidates = []

    # -------------------------------------------------------
    # Build mapping: txid → mined timestamp string
    # -------------------------------------------------------
    blocks = re.split(r"(?=^[0-9a-f]{64}$)", raw_output, flags=re.MULTILINE)
    txid_to_mined = {}
    txid_to_block = {}
    mined_re = re.compile(r"Mined:\s+\d+\s+\(([^)]+)\)")

    for block in blocks:
        block = block.strip()
        if not block:
            continue
        first_line = block.splitlines()[0].strip()
        if not re.match(r"^[0-9a-f]{64}$", first_line):
            continue

        txid = first_line
        txid_to_block[txid] = block
        m = mined_re.search(block)
        if m:
            txid_to_mined[txid] = m.group(1).strip()

    # -------------------------------------------------------
    # Store only the latest transaction per zid
    # -------------------------------------------------------
    tx_candidates = []
    for tx in memos:
        txid = tx["txid"]
        memo = tx["memo"]
        zid = tx["zid"]

        mined_raw = txid_to_mined.get(txid)
        tx_time = None

        # Normalize mined timestamp
        if mined_raw:
            ts = mined_raw
            ts = ts.replace(".0 ", " ")
            ts = ts.replace("+00:00:00", "+00:00")
            ts = re.sub(r" (\d):", r" 0\1:", ts)

            try:
                mined_at = datetime.fromisoformat(ts)
                tx_time = mined_at.isoformat()
            except:
                tx_time = None

        tx_candidates.append({
            "txid": txid,
            "memo": memo,
            "zid": zid,
            "tx_time": tx_time,
            "mined_raw": mined_raw,
            "order": len(tx_candidates),
        })

    latest_by_zid = {}
    for candidate in tx_candidates:
        zid = candidate["zid"]
        if zid is None:
            continue
        existing = latest_by_zid.get(zid)
        if not existing:
            latest_by_zid[zid] = candidate
            continue
        existing_time = existing.get("tx_time")
        candidate_time = candidate.get("tx_time")
        if existing_time and candidate_time:
            if candidate_time > existing_time:
                latest_by_zid[zid] = candidate
            continue
        if candidate_time and not existing_time:
            latest_by_zid[zid] = candidate
            continue
        if not candidate_time and not existing_time:
            if candidate["order"] > existing["order"]:
                latest_by_zid[zid] = candidate

    pending_candidates = []

    for candidate in latest_by_zid.values():
        txid = candidate["txid"]
        memo = candidate["memo"]
        zid = candidate["zid"]
        tx_time = candidate["tx_time"]
        mined_raw = candidate["mined_raw"]

        record = {
            "zid": zid,
            "txid": txid,
            "memo": memo,
            "tx_time": tx_time,
            "ts": datetime.utcnow().isoformat() + "Z",
            "raw": mined_raw,
        }

        try:
            sb.table("transactions").upsert(record, on_conflict=["txid"]).execute()
            upserts += 1
        except Exception as e:
            print(f"Upsert failed for tx {txid}: {e}")
            continue

        try:
            raw_block = txid_to_block.get(txid)
            sb.table("transaction_ingest_log").insert({
                "txid": txid,
                "source": source,
                "memo_raw": memo,
                "memo_norm": memo,
                "raw_payload": {"block": raw_block} if raw_block else None,
            }).execute()
        except Exception as e:
            print(f"Ingest log failed for tx {txid}: {e}")

        # Extract pending edits ONLY IF memo is a {z:...}
        if not memo:
            continue

        m = re.search(r"\{z:(\d+)(.*)\}", memo)
        if not m:
            continue

        zcid = int(m.group(1))
        body = m.group(2)

        profile_edits = {}
        link_edits = []

        kv_tokens = re.findall(r'([nbiach]):"([^"]*)"', body)
        for key, val in kv_tokens:
            if key == "n":
                profile_edits["name"] = val
            elif key == "b":
                profile_edits["bio"] = val
            elif key == "i":
                profile_edits["profile_image_url"] = val
            elif key == "a":
                profile_edits["address"] = val
            elif key == "c":
                profile_edits["c"] = val
            elif key == "h":
                profile_edits["display_name"] = val

        city_match = re.search(r'c:([0-9]+|-)', body)
        if city_match:
            cid = city_match.group(1)
            if cid == "-":
                profile_edits["nearest_city_id"] = None
            else:
                profile_edits["nearest_city_id"] = int(cid)

        d_match = re.search(r'd:\[(.*?)\]', body)
        if d_match:
            delete_codes = re.findall(r'"([abnih])"', d_match.group(1))
            if delete_codes:
                profile_edits["d"] = delete_codes

        l_match = re.search(r'l:\[(.*?)\]', body)
        if l_match:
            inner = l_match.group(1)
            tokens = re.findall(r'"([^"]+)"', inner)
            if tokens:
                link_edits = tokens

        if profile_edits or link_edits:
            pending_candidates.append({
                "zcasher_id": zcid,
                "raw_memo": memo,
                "profile": profile_edits,
                "links": link_edits,
            })

    for candidate in pending_candidates:
        zcid = candidate["zcasher_id"]
        try:
            sb.table("pending_zcasher_edits").update(
                {"processed": True}
            ).eq("zcasher_id", zcid).eq("processed", False).execute()
        except Exception as e:
            print(f"Failed to mark older pending edits for z:{zcid}: {e}")

        try:
            sb.table("pending_zcasher_edits").insert({
                "zcasher_id": zcid,
                "raw_memo": candidate["raw_memo"],
                "profile": candidate["profile"],
                "links": candidate["links"],
            }).execute()
        except Exception as e:
            print(f"Failed to insert pending edits for z:{zcid}: {e}")

    # -------------------------------------------------------
    log_event(None, "wallet_scan_insert_complete", "ok", f"{upserts} memos inserted")
    return upserts


def scan_wallet_and_store(sb):
    enhance_wallet()
    result = scan_wallet()
    if result["returncode"] != 0:
        print("❌ scan_wallet failed:", result["stderr"] or result["stdout"])
        return 0
    count = parse_and_store_transactions(result["stdout"], sb, source="devtool")
    print(f"✅ Stored {count} memos with ZIDs.")
    return count

def health_check():
    print("🔍 Checking wallet health...")
    r = run_command(['balance'])
    if "Height" not in r['stdout']:
        print("❌ Wallet unreachable or broken.")
        return
    print("✅ Wallet responsive.")
    if "Sapling" not in r['stdout']:
        print("⚠️ Schema might be incomplete, run full resync.")
    else:
        print("✅ Schema OK, balance query normal.")

def ensure_funds(min_zec=0.001):
    from decimal import Decimal
    result = run_command(['balance'])
    stdout = result['stdout']
    m = re.search(r'Balance:\s+([\d\.]+)', stdout)
    if not m:
        raise RuntimeError("Unable to read wallet balance")
    balance = Decimal(m.group(1))
    if balance < Decimal(min_zec):
        raise RuntimeError(f"Insufficient funds: {balance} ZEC < {min_zec} ZEC")
    print(f"✅ Wallet has sufficient balance: > {min_zec} ZEC")
