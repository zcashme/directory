# Zcash Verification Service - Architecture

## VM Overview

The verification service runs on a VM (`zecviewkey@172.206.17.233`) that hosts a Zcash full node and multiple application services.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         zecviewkey VM (172.206.17.233)                       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                           ZCASHD FULL NODE                              ││
│  │  Port 8232 (RPC) ─── localhost only ✓                                   ││
│  │  Port 8233 (P2P) ─── public (peer connections)                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                    │                                         │
│                              RPC calls                                       │
│                                    ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────────┐
│  │                         APPLICATION LAYER                                │
│  │                                                                          │
│  │  :8000  uvicorn     verify.zcash.me    ZVS (FastAPI) ← verification     │
│  │  :5000  gunicorn    view.zcash.me      viewkey explorer                 │
│  │  :5002  python3     forum.zcash.me     Flask forum                      │
│  │  :5004  ?           sendmany.zcash.me  batch sender                     │
│  │  :5080  gunicorn    pos.zcash.me       point of sale                    │
│  └──────────────────────────────────────────────────────────────────────────┘
│                                    │                                         │
│                               nginx :80/:443                                 │
│                          (reverse proxy + SSL)                               │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
                                 INTERNET
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
              Your Directory App              Other Clients
              (Vercel/Next.js)
```

---

## Services Running on VM

| Subdomain | Port | Stack | Purpose |
|-----------|------|-------|---------|
| `verify.zcash.me` | 8000 | FastAPI/uvicorn | Verification service - polls memos, sends OTPs |
| `view.zcash.me` | 5000 | Flask/gunicorn | Viewkey explorer - read wallet history |
| `forum.zcash.me` | 5002 | Flask | Community forum |
| `sendmany.zcash.me` | 5004 | ? | Batch transaction sender |
| `pos.zcash.me` | 5080 | Flask/gunicorn | Point of sale system |

---

## How the Application Layer Talks to the Full Node

### RPC Mode (Production)

Direct JSON-RPC calls to zcashd on port `8232`:

```
POST http://127.0.0.1:8232/
{"jsonrpc":"1.0", "method":"z_listreceivedbyaddress", "params":[...]}
```

Uses basic auth (`ZCASH_RPC_USER` / `ZCASH_RPC_PASS`). Key RPC methods:

| Method | Purpose |
|--------|---------|
| `z_listreceivedbyaddress` | Retrieve shielded transactions with memos |
| `z_sendmany` | Send shielded transactions (for OTPs) |
| `z_getoperationstatus` | Check async send progress |
| `getblockhash` / `getblockheader` | Chain info for timestamps |

### Devtool Mode (Legacy/Windows Dev)

Executes `zcash-devtool.exe` as a subprocess, which connects to lightwalletd servers (zecrocks, ecc) rather than the local node. Commands: `sync`, `enhance`, `list-tx`, etc.

This mode exists for local Windows development before the VM was set up.

---

## Verification Flow

The service implements a **Sybil-resistant profile verification system** using Zcash shielded memos:

```
User Wallet ──[Z→Z tx with memo]──▶ Admin Wallet
                                         │
                   ┌─────────────────────┘
                   ▼
         /verify/check scans memos
                   │
         Parse {z:15,b:"New bio"}
                   │
         Store in pending_zcasher_edits
                   │
         Admin sends OTP back via memo
                   │
         User enters OTP in frontend
                   │
         Edits promoted to zcasher table
```

**The Zcash blockchain provides:**

1. **Sybil resistance** - must own funds to send a tx
2. **Encrypted channel** - shielded memos are private
3. **Address ownership proof** - sending from an address proves you control it

---

## Security Model

### Why FastAPI on VM (not Vercel)?

The wallet's private keys live on the VM. To send OTPs, you must sign transactions with those keys.

```
Vercel serverless function
        │
        ▼
   ??? How do you sign transactions ???
        │
        ▼
   Keys are on your VM, not accessible from Vercel
```

If zcashd RPC were exposed to the internet, anyone who found the endpoint could drain the wallet.

**The FastAPI service exists as a security boundary** - it sits on the same machine as the wallet, so RPC stays on localhost.

### Security Checklist

| Layer | Protection |
|-------|------------|
| zcashd RPC | `rpcallowip=127.0.0.1` (localhost only) |
| FastAPI | CORS whitelist, HTTPS via nginx |
| Supabase | Service key on VM only, anon key for frontend |
| OTP | SHA-256 hashed, 3 attempts, 24h expiry |
| Secrets | `.env` file, never committed |

### Current Security Status

**Good:**
- zcashd RPC on `127.0.0.1:8232` only (not exposed)
- nginx handles SSL termination (Let's Encrypt)
- Services bind to localhost, nginx proxies

**Potential concerns:**
- uvicorn (ZVS) binds to `0.0.0.0:8000` - exposed directly, though nginx also proxies it
- One VM runs everything (single point of failure)

---

## Directory Structure on VM

```
/home/zecviewkey/
├── zvs/
│   └── zcash-verification-service/    # ZVS FastAPI service (production)
│       ├── api/
│       │   ├── verify_routes_rpc_zid_poll.py  # Main endpoints
│       │   ├── otp_service.py
│       │   └── admin_routes.py
│       ├── core/
│       │   ├── zcash_rpc.py           # RPC client
│       │   ├── zcash_runner.py        # Devtool wrapper
│       │   └── supabase_client.py
│       └── .env                        # Credentials
├── get-latest-memos/                   # view.zcash.me
├── donate-zcash-me/                    # Next.js donation app
├── forum-zcash-me/                     # Flask forum
├── newsletter-zcash-me/                # Newsletter service
├── zcash-pos-nscafe/                   # POS system
└── zcash-verification-service/         # Older copy (read-only)
```

---

## Systemd Services

### ZVS Service

```ini
# /etc/systemd/system/zvs.service
[Unit]
Description=Zcash Verification Service (FastAPI)
After=network.target

[Service]
User=zecviewkey
WorkingDirectory=/home/zecviewkey/zvs/zcash-verification-service
Environment=PYTHONUNBUFFERED=1
ExecStart=/home/zecviewkey/zvs/zcash-verification-service/.venv/bin/uvicorn api.verify_routes_rpc_zid_poll:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### Common Commands

```bash
# Restart ZVS
sudo systemctl restart zvs.service

# Check status
systemctl status zvs.service

# View logs
journalctl -u zvs.service -f
```

---

## Nginx Configuration

```nginx
server {
    server_name verify.zcash.me;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/verify.zcash.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/verify.zcash.me/privkey.pem;
}
```

---

## Future: WebSocket Integration

Currently polling-based:

```
Frontend polls → FastAPI → RPC → check for memo
         ↑______________|
         (every 1.5s)
```

With WebSockets (faster):

```
FastAPI watches RPC → pushes to Frontend instantly
```

Example implementation:

```python
from fastapi import WebSocket

@app.websocket("/verify/ws/{request_id}")
async def verify_websocket(websocket: WebSocket, request_id: str):
    await websocket.accept()
    while True:
        match = check_for_match(request_id)
        if match:
            await websocket.send_json({"status": "matched", ...})
            break
        await asyncio.sleep(1)
```

---

## SSH Access

```bash
# From local machine
ssh -i ~/.ssh/friend_zcashme zecviewkey@172.206.17.233

# Or use alias (if configured in .zshrc)
zecvm
```

---

## Related Documentation

- `readme.md` - Full system flow and API documentation
- `readme_OTP.md` - OTP generation and confirmation details
- `.env.example` - Required environment variables
