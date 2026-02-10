# Zcash Verification Service v1.0

*A fully manual, admin-driven Zcash profile verification and edit-promotion pipeline.*

This service receives verification and edit requests via encrypted Zcash memos, extracts pending edits, stores them, and after manual OTP confirmation promotes those edits into the public Zcashers registry.

### Safety guarantees

* Hash-based OTP comparison
* Attempt limits
* Expiration
* Single-use OTPs
* Single pending-edit consumption

This document describes the system end-to-end.

---

## Local Development Quickstart

**FastAPI entry point (current)**

```
api/verify_routes_rpc_zid_poll.py
```

**Run locally (RPC-based)**

```
.\.venv\Scripts\activate
uvicorn api.verify_routes_rpc_zid_poll:app --reload
```

**API**

```
http://127.0.0.1:8000
```

**Docs**

```
http://127.0.0.1:8000/docs
```

---

## Deployment Reality Check (Important)

The **VM code is separate** from anything on GitHub. Updating code locally or pushing to GitHub **does not** change the running backend unless you also deploy it to the VM.

**Implication:**
- Local testing alongside the localhost frontend is **not** production.
- Local and VM environments can differ. A flow that works locally may still fail or behave differently on the VM. Concrete differences observed between the current VM file and local file:
  - **CORS allowlist**: VM allows production domains (`https://zcash.me`, `https://www.zcash.me`, `https://verify.zcash.me`) in addition to localhost; local only allows localhost origins.
  - **Memo match rule**: VM’s `_fast_match_receipt` requires both `{z:<id>}` and a `rid:<request_id>` tag; local only requires `{z:<id>}`.
  - **Receipt scan scope**: VM scans all receipts; local sorts receipts and only scans a tail (`RPC_TAIL_SIZE = 8`).
  - **Request ID generation**: VM generates IDs with a local `alphabet` + manual collision check; local uses `REQUEST_ID_ALPHABET`, `REQUEST_ID_LEN`, and `_get_poll_request`.
  - **Admin router import**: VM imports and mounts `admin_routes` unconditionally; local makes it optional.
- After local testing, you must **both**:
  1) Commit + push the `zcash-verification-service` code to GitHub, **and**
  2) Copy or deploy that code to the VM.

### VM Deployment (Current Process)

The ZVS service runs on the VM at:

```
/home/zecviewkey/zvs/zcash-verification-service
```

It is started by systemd:

```
ExecStart=/home/zecviewkey/zvs/zcash-verification-service/.venv/bin/uvicorn \
  api.verify_routes_rpc_zid_poll:app --host 0.0.0.0 --port 8000
```

### Deploy Steps (Manual Copy)

If you are **not** using git pull on the VM:

1. Copy your updated code to the VM (preserve the same directory).
2. Restart the service:

```
sudo systemctl restart zvs.service
```

3. Verify it is running:

```
systemctl status zvs.service
```

### Deploy Steps (GitHub-Driven)

If the VM is a git checkout:

```
cd /home/zecviewkey/zvs/zcash-verification-service
git pull
sudo systemctl restart zvs.service
```

If you **only** commit + push locally and do **not** deploy to the VM, production will not change.

**Quickstart: devtool vs RPC**

PowerShell (devtool / default):

```
Invoke-WebRequest -Method POST "http://127.0.0.1:8000/verify/check"
```

PowerShell (RPC):

```
Invoke-WebRequest -Method POST "http://127.0.0.1:8000/verify/check?use_rpc=true"
```

PowerShell (RPC-only app):

```
Invoke-WebRequest -Method POST "http://127.0.0.1:8000/verify/check"
```

---

## Canonical System Flow (Authoritative)

Zcashers submit profile updates by sending a Z→Z transaction to the admin wallet with a memo such as:

```
{z:15,b:"New bio",n:"New Name",+!https://twitter.com/...,-123}
```

The system flow is:

1. Admin runs `/verify/check`
2. Wallet syncs and memos are parsed
3. Pending edits are stored in `public.pending_zcasher_edits`
4. Admin generates an OTP via `/verify/send-otp` (auto-sent on-chain)
6. User enters OTP in frontend (`SubmitOtp.jsx`)
7. Frontend calls Supabase RPC `public.confirm_otp_sql`
8. OTP is validated and edits are promoted
9. Pending edit row is marked processed

This yields a wallet-based, Sybil-resistant identity update system.

---

## Architecture

```
User Wallet → Admin Wallet
↓
/verify/check → sync → scan → parse → pending edits
↓
Admin triggers OTP send (auto Z-memo)
↓
User enters OTP in frontend
↓
Supabase RPC confirm_otp_sql → promote edits
```

All state is stored in Postgres via Supabase.

---

## Wallet Sync, Parsing, and Storage

### Wallet Sync Pipeline

```
/verify/check
→ sync_wallet
→ enhance_wallet
→ scan_wallet
→ parse_memos
→ parse_and_store_transactions
```

Uses:

* `zcash-devtool.exe wallet list-tx`
* `parse_memos(raw_output)`
* `parse_and_store_transactions(raw_output, sb)`

### Scan Mode: devtool (use_rpc=false, default)

Runs the legacy zcash-devtool flow:

* `sync_wallet` -> `enhance_wallet` -> `scan_wallet`
* `POST /verify/check` (or `POST /verify/check?use_rpc=false`)
* OTP sends use the devtool send path and require `WALLET_DIR` and `ADMIN_ACCOUNT_ID`

### Scan Mode: RPC (use_rpc=true)

Runs the zcashd RPC flow and adapts receipts to devtool-like output:

* `POST /verify/check?use_rpc=true`
* OTP sends use RPC `sendmany` from `ADMIN_ADDRESS_INBOX`
* Optional debug: `RPC_DUMP_ALL=true` or `RPC_DUMP_TXID=<txid>`

RPC env checklist:

* `ZCASH_RPC_URL`
* `ZCASH_RPC_USER`
* `ZCASH_RPC_PASS`
* `ZCASH_ADMIN_INBOX` (or `ADMIN_ADDRESS_INBOX`)

RPC via SSH tunnel (PowerShell):

```
ssh -i C:\Users\jjose\.ssh\zecviewkey-zechariah.pem -L 8232:127.0.0.1:8232 zecviewkey@172.206.17.233
```

RPC-only app (no use_rpc param):

```
uvicorn api.verify_routes_rpc:app --reload
Invoke-WebRequest -Method POST "http://127.0.0.1:8000/verify/check"
```

Tunnel check:

```
Test-NetConnection -ComputerName 127.0.0.1 -Port 8232
```

RPC health check (PowerShell):

```
$pair = "$env:ZCASH_RPC_USER:$env:ZCASH_RPC_PASS"
$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8232 `
  -Headers @{ Authorization = "Basic $auth" } `
  -Body '{"jsonrpc":"1.0","id":"ping","method":"getblockchaininfo","params":[]}'
```

### Memo Detection

Memos matching:

```
Memo::Text("{z:<id> ... }")
```

are treated as verification requests.

### Stored Transaction Fields (`public.transactions`)

| Column  | Meaning             |
| ------- | ------------------- |
| txid    | Transaction ID      |
| memo    | Raw memo            |
| zid     | Parsed `{z:...}`    |
| ts      | Insert timestamp    |
| raw     | Raw mined timestamp |
| tx_time | Parsed chain time   |

Chronological correctness is preserved even with delayed scans.

---

## Pending Edit Extraction

### Profile Tokens → `pending_zcasher_edits.profile`

| Token     | Field             |
| --------- | ----------------- |
| `n:"..."` | name              |
| `b:"..."` | bio               |
| `i:"..."` | profile_image_url |
| `h:"..."` | display_name      |
| `a:"..."` | address           |

Stored as JSONB:

```
public.pending_zcasher_edits.profile
```

### Link Tokens → `pending_zcasher_edits.links`

Stored as a JSONB array. See Link Mutation Semantics below.

---

## OTP Generation

**Endpoint**

```
POST /verify/send-otp?zcasher_id=15
```

**PowerShell**

```
Invoke-WebRequest -Method POST "http://127.0.0.1:8000/verify/send-otp?zcasher_id=15"
```

**Config**

```
OTP_AUTO_SEND=true  # set false to generate-only (manual send)
OTP_AMOUNT_ZEC=0.0005
OTP_HITL=true       # prompt before sending OTPs during /verify/check
```

Notes:
- `/verify/check` now detects new verification txs and (optionally) triggers OTP sends.
- When `/verify/check` triggers OTP sends, it skips the extra sync/enhance in the send path
  to avoid double-sync.
- If the latest OTP send for a ZID failed (`otp_send_success=false`), that ZID is still
  considered a candidate on the next `/verify/check` regardless of tx time.
- HITL mode can mark transactions with `tx_ignore=true` to suppress them in future runs.

**Stored in `verification_codes`**

| Field         | Meaning                            |
| ------------- | ---------------------------------- |
| otp           | Plaintext (returned to admin only) |
| code_hash     | SHA-256 hash                       |
| attempts_left | Starts at 3                        |
| expires_at    | 24h UTC                            |
| is_verified   | false                              |
| otp_send_success | true/false/null                 |
| otp_send_txid    | txid if send succeeded          |

Also requires `transactions.tx_ignore` (boolean) to suppress ignored requests.

OTP delivery is automatic via Zcash memo.

---

## OTP Confirmation and Edit Promotion (Authoritative)

### Submission

User enters OTP in the frontend dialog:

```
zcashme\src\SubmitOtp.jsx
C:\Users\jjose\OneDrive\Desktop\zcashme\src\SubmitOtp.jsx
```

Frontend calls:

```
supabase.rpc("confirm_otp_sql", { in_zcasher_id, in_otp })
```

OTP is sent on-chain via zcash-devtool.

### Validation Checks

| Check       | Behavior                  |
| ----------- | ------------------------- |
| Recency     | Only most recent OTP      |
| Attempts    | Fail if attempts_left ≤ 0 |
| Expiration  | Fail if now > expires_at  |
| Equivalence | SHA-256 hash comparison   |

### On Success

1. `verification_codes.is_verified = true`
2. `zcasher.address_verified = true`
3. `zcasher.last_verified_at = now()`
4. Promote **latest unprocessed** pending edit:

   * name
   * bio
   * profile_image_url
   * display_name
   * address
   * link mutations
5. `pending_zcasher_edits.processed = true`

### Hash Comparison (only place equivalence is checked)

```sql
supplied_hash := encode(sha256(in_otp::bytea), 'hex');

if supplied_hash <> vc.code_hash then
```

On failure:

* attempts decremented
* status `invalid`
* no edits applied

---

## Link Mutation and Verification Semantics

### Grammar

| Token   | Effect                              |
| ------- | ----------------------------------- |
| `+url`  | Insert link, unverified             |
| `+!url` | Insert link, pending_verif = true   |
| `!id`   | Existing link: pending_verif = true |
| `-id`   | Delete link                         |

### Flags

| Column        | Meaning         |
| ------------- | --------------- |
| is_verified   | Admin-confirmed |
| pending_verif | User-requested  |

Only admin actions can set `is_verified = true`.

---

---

## Complete Test Tract (Canonical)

### Input Memo

```
{z:15,b:"Updated bio",+!https://reddit.com/r/Zcash,-42}
```

### Expected Pending Edits

```
profile.bio = "Updated bio"
links = ["+!https://reddit.com/r/Zcash", "-42"]
```

### Admin Actions

```
POST /verify/check
POST /verify/send-otp?zcasher_id=15
```

**PowerShell**

```
Invoke-WebRequest -Method POST "http://127.0.0.1:8000/verify/check"
Invoke-WebRequest -Method POST "http://127.0.0.1:8000/verify/send-otp?zcasher_id=15"
```

### OTP Submission

Handled via `SubmitOtp.jsx`, calling:

```
supabase.rpc("confirm_otp_sql", { in_zcasher_id, in_otp })
```

### Expected Result

* Link ID 42 deleted
* Reddit link inserted:

  * is_verified = false
  * pending_verif = true

---

## SQL Verification Cookbook

```sql
select * from transactions order by ts desc;
select * from pending_zcasher_edits where zcasher_id=? order by created_at desc;
select * from verification_codes where zcasher_id=?;
select * from zcasher where id=?;
select * from zcasher_links where zcasher_id=?;
```

---

# End of README

---
