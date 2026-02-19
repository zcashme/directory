# /lib/verification - ZVS Verification Logic

## Purpose
Server-side logic for Zcash Verification System (ZVS). Users prove address ownership
by sending a transaction with a specific memo, then entering a deterministic OTP.

## How Verification Works

1. **Client requests memo** - Calls `generateMemoAction` → server creates session ID, memo, and URI
2. **User sends transaction** - To ZVS address with memo in format `zvs/{session_id},{u-address}`
3. **Backend wallet receives tx** - Decrypts memo, computes OTP, sends ZEC back with OTP in memo
4. **User enters OTP** - Client sends memo + OTP to server for verification
5. **Profile verified** - Server recomputes OTP from memo, marks profile as verified

## Key Files

### generateMemoAction.ts
Server action that generates memo + zcash: URI. The session ID and memo are
created server-side so the client can never fabricate memos to brute-force OTPs.
```typescript
"use server"
import { generateMemoAction } from "./generateMemoAction";

const result = await generateMemoAction(profileId, "0.003");
// → { ok: true, memo: "zvs/1234...,u1abc...", uri: "zcash:u1...?amount=0.003&memo=..." }
```

### memoStore.ts
In-memory store for server-issued memos. Tracks OTP attempts per memo and
rejects any memo not issued by the server.
- Max 5 OTP attempts per memo (configurable via `MAX_ATTEMPTS`)
- Memos expire after 30 minutes
- On exhaustion, `confirmOtpAction` auto-generates a new memo and returns it
```typescript
import { registerMemo, getMemoEntry, recordFailure, removeMemo } from "./memoStore";
```

### session.ts
Session ID generation and memo building (server-side only).
```typescript
import { generateSessionId, buildZvsMemo, parseZvsMemo } from "./session";

const sessionId = generateSessionId();  // 16 random ASCII digits
const memo = buildZvsMemo(sessionId, userAddress);
// → "zvs/1234567890123456,u1abc..."
```

### otp.ts
HMAC-SHA256 based OTP generation and verification.
```typescript
import { generateOtp, verifyOtp } from "./otp";

const otp = await generateOtp(memo);  // 6-digit string
const isValid = await verifyOtp(memo, userInput);  // boolean
```
Requires `ZVS_SECRET_SEED` environment variable (throws in production if missing).

### confirmOtpAction.ts
Main server action for OTP verification. Checks the memo was server-issued,
enforces the 5-attempt cap, and on exhaustion returns a fresh memo + URI.
```typescript
"use server"
import { confirmOtpAction } from "./confirmOtpAction";

// Client passes memo (from server) + OTP (from user input)
const result = await confirmOtpAction(zcasherId, otp, memo, edits?);
// Success: { ok: true, data: { status: "verified" } }
// Failure: { ok: false, data: { status: "invalid" }, error: "...N attempts remaining." }
// Exhausted: { ok: false, data: { status: "exhausted", newMemo, newUri } }
```

## Memo Format
```
zvs/{session_id},{user_address}
```
- No curly braces in actual memo
- session_id: 16 ASCII digits
- user_address: Full unified address

Example:
```
zvs/2026021505421234,u1d9l0a8ldht9zcpkmppd8s9lpev724l5afh3dl9ds8rt09aunghcx7xtnk980e9rjgn5j6jjfxvspm300g65a9sxq3uu68dlrwc8lhvektu7tacrxlm6lh549jed7k0wxpajv7xl46u23v6vzq6ycjg48avwdpfqlrmk4c8ft8qqy3vx5
```

## Security Notes
- OTP is deterministic (HMAC-SHA256) - same memo always produces same OTP
- Secret seed stored in `ZVS_SECRET_SEED` env var (required in production)
- Memo generation is server-side only — client cannot fabricate memos
- In-memory store rejects unrecognised memos and caps OTP attempts at 5
- After 5 failed attempts the memo is invalidated and a new one is issued
- Memo lives in client React state for display only; if user refreshes they must start over

## Flow Diagram
```
Client calls generateMemoAction(profileId, amount)
         ↓
    Server: generateSessionId() → buildZvsMemo() → buildZcashUri()
         ↓
    Server: registerMemo() in memoStore (tracks attempts)
         ↓
    Returns { memo, uri } to client
         ↓
    Client stores memo in React state, displays QR
         ↓
    User sends transaction with memo from wallet
         ↓
    Backend wallet receives tx, computes OTP, sends back
         ↓
    User sees OTP in wallet, enters it
         ↓
    Client calls confirmOtpAction(zcasherId, otp, memo)
         ↓
    Server: getMemoEntry() → reject if unknown/expired
         ↓
    Server: verifyOtp(memo, otp)
         ↓
    Valid  → removeMemo(), update zcasher.address_verified = true
    Invalid → recordFailure()
              └─ exhausted? → generate new memo, return { newMemo, newUri }
              └─ not yet   → return "N attempts remaining"
```
