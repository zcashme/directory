# Verification Service Architecture

## Current Architecture

```
Vercel (Next.js)                    VPS (172.206.17.233)
┌─────────────────────┐             ┌─────────────────────────────┐
│ Frontend            │             │ Python FastAPI              │
│ /api/directory      │───HTTP────▶│ zcashd node                 │
│ /api/resolve        │             │ Wallet keys                 │
│ /api/social         │             │ Background polling          │
└─────────────────────┘             └─────────────────────────────┘
```

**Components:**
- **Vercel**: Frontend + public API endpoints
- **VPS**: Python verification service + zcashd full node
- **Communication**: HTTP between Vercel and VPS

## Proposed Architecture

Move verification logic to Next.js, keep only zcashd on VPS.

```
Vercel (Next.js)                    VPS
┌─────────────────────┐             ┌─────────────────────┐
│ Frontend            │             │                     │
│ /api/directory      │             │ zcashd node         │
│ /api/resolve        │───RPC/HTTPS─▶│ (RPC only)          │
│ /api/social         │             │                     │
│ /api/verify/*       │             │                     │
└─────────────────────┘             └─────────────────────┘
```

**Benefits:**
- Single codebase (TypeScript only)
- Single deployment (Vercel)
- No Python service to maintain
- Simpler ops

## Implementation Plan

### 1. Expose zcashd RPC securely

On VPS, configure zcashd for remote access:

```conf
# ~/.zcash/zcash.conf
rpcuser=zcashme_rpc
rpcpassword=<strong-password>
rpcallowip=0.0.0.0/0
rpcbind=0.0.0.0
```

Put behind HTTPS (nginx or Cloudflare Tunnel):

```nginx
# /etc/nginx/sites-available/zcashd
server {
    listen 443 ssl;
    server_name zcashd.zcash.me;

    ssl_certificate /etc/letsencrypt/live/zcashd.zcash.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/zcashd.zcash.me/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8232;
        proxy_set_header Host $host;

        # Basic auth handled by zcashd RPC
    }
}
```

### 2. Create TypeScript RPC client

```typescript
// lib/zcash/rpc.ts
const ZCASH_RPC_URL = process.env.ZCASH_RPC_URL!;
const ZCASH_RPC_USER = process.env.ZCASH_RPC_USER!;
const ZCASH_RPC_PASS = process.env.ZCASH_RPC_PASS!;

interface RpcResponse<T> {
  result: T;
  error: { code: number; message: string } | null;
  id: string;
}

export async function zcashRpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const response = await fetch(ZCASH_RPC_URL, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${ZCASH_RPC_USER}:${ZCASH_RPC_PASS}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '1.0',
      id: crypto.randomUUID(),
      method,
      params,
    }),
  });

  const data: RpcResponse<T> = await response.json();

  if (data.error) {
    throw new Error(`RPC Error: ${data.error.message}`);
  }

  return data.result;
}

// Convenience methods
export async function listReceivedByAddress(address: string, minconf = 1) {
  return zcashRpc<ReceivedMemo[]>('z_listreceivedbyaddress', [address, minconf]);
}

export async function sendMany(fromAddress: string, amounts: SendAmount[]) {
  return zcashRpc<string>('z_sendmany', [fromAddress, amounts]);
}

export async function getOperationStatus(opid: string) {
  return zcashRpc<OperationStatus[]>('z_getoperationstatus', [[opid]]);
}
```

### 3. Create verification API routes

```typescript
// app/api/verify/check/route.ts
import { listReceivedByAddress } from '@/lib/zcash/rpc';
import { createSupabaseServerClient } from '@/lib/supabase/supabase-server';

const ADMIN_ADDRESS = process.env.ADMIN_ZCASH_ADDRESS!;

export async function POST(request: Request) {
  const { zcasherId } = await request.json();

  // Get memos from zcashd
  const memos = await listReceivedByAddress(ADMIN_ADDRESS);

  // Parse and process new memos
  const newEdits = memos
    .filter(m => !m.processed)
    .map(parseMemo)
    .filter(Boolean);

  // Store pending edits in Supabase
  const supabase = createSupabaseServerClient();
  // ... store logic

  return Response.json({ pendingEdits: newEdits });
}
```

```typescript
// app/api/verify/confirm/route.ts
import { sendMany } from '@/lib/zcash/rpc';

export async function POST(request: Request) {
  const { zcasherId, otp } = await request.json();

  // Validate OTP
  // Promote pending edits
  // Send confirmation memo via z_sendmany

  return Response.json({ status: 'confirmed' });
}
```

### 4. Environment variables

Add to Vercel environment:

```env
ZCASH_RPC_URL=https://zcashd.zcash.me
ZCASH_RPC_USER=zcashme_rpc
ZCASH_RPC_PASS=<strong-password>
ADMIN_ZCASH_ADDRESS=zs1...
```

## Verification Flow

### On-Demand (No Background Polling)

```
1. User sends Z→Z memo with profile edit
2. User clicks "Check for my transaction" in app
3. App calls POST /api/verify/check
4. Route calls zcashd z_listreceivedbyaddress
5. Parses memo, stores pending edit
6. Returns pending edit to user
7. User enters OTP
8. App calls POST /api/verify/confirm
9. Route promotes edit, sends confirmation memo
```

**Tradeoff:** Memos only detected when user actively checks.
**Benefit:** No background process needed.

## Security Considerations

1. **RPC over HTTPS only** - Never expose raw RPC
2. **Strong RPC password** - Use 32+ character random password
3. **IP whitelist if possible** - Limit to Vercel IP ranges
4. **Separate wallet** - Use dedicated wallet for verification, not main funds
5. **Monitor transactions** - Alert on unexpected outgoing transactions

## Migration Steps

1. [ ] Set up nginx/Cloudflare Tunnel for zcashd HTTPS
2. [ ] Create TypeScript RPC client
3. [ ] Port verification logic from Python to TypeScript
4. [ ] Create /api/verify/* routes
5. [ ] Test on staging
6. [ ] Deploy to production
7. [ ] Deprecate Python service
8. [ ] Remove Python code from repo

## Files to Create

```
lib/zcash/
├── rpc.ts              # RPC client
├── memo.ts             # Memo parsing/encoding
└── types.ts            # TypeScript types

app/api/verify/
├── check/route.ts      # Check for new memos
├── confirm/route.ts    # Confirm OTP, promote edits
└── status/route.ts     # Get operation status
```

## Rollback Plan

If issues arise:
1. Point NEXT_PUBLIC_VERIFY_API_URL back to Python service
2. Python service still running on VPS
3. No data loss (both use same Supabase)
