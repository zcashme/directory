# /lib/verification - ZVS Verification Logic

## Purpose
Server-side logic for Zcash Verification System (ZVS). Users prove address ownership
by sending a transaction with a specific memo, then entering a deterministic OTP.

## How Verification Works

1. **Client requests memo** — Calls `generateMemoAction` → server creates session ID, memo, and URI
2. **User sends transaction** — To ZVS address with memo in format `zvs/{session_id},{u-address}`
3. **Backend wallet receives tx** — Decrypts memo, computes OTP, sends ZEC back with OTP in memo
4. **User enters OTP** — Client sends memo + OTP to server for verification
5. **Server verifies OTP** — Recomputes HMAC-SHA256 from memo, compares to user input
6. **Profile verified** — Marks `address_verified = true`, applies any profile edits

## Architecture: Stateless HMAC Verification

OTP verification is **fully stateless** on the server — no in-memory store, no database
lookups for memo tracking. This is critical for Vercel serverless where each function
invocation may run on a different instance.

The HMAC-SHA256 is self-validating: only the server knows `ZVS_SECRET_SEED`, so a
forged memo produces the wrong OTP. The crypto itself proves the memo is legitimate.

Attempt limiting (5 tries) is enforced **client-side** as a UX guardrail in
`ProfileVerification.tsx`. It resets when a new QR is generated.

## Key Files

### generateMemoAction.ts
Server action that generates memo + `zcash:` URI.
```typescript
"use server"
const result = await generateMemoAction(profileId, "0.004");
// → { ok: true, memo: "DO NOT MODIFY:{zvs/1234...,u1abc...}", uri: "zcash:u1...?amount=0.004&memo=..." }
```

### session.ts
Session ID generation and memo building/parsing.
```typescript
import { generateSessionId, buildZvsMemo, parseZvsMemo } from "./session";

const sessionId = generateSessionId();  // 16 random ASCII digits
const memo = buildZvsMemo(sessionId, userAddress);
// → "DO NOT MODIFY:{zvs/1234567890123456,u1abc...}"

const parsed = parseZvsMemo(memo);
// → { sessionId: "1234567890123456", userAddress: "u1abc..." }
```

### otp.ts
HMAC-SHA256 based OTP generation and verification.
```typescript
import { verifyOtp } from "./otp";

const isValid = await verifyOtp(memo, userInput);  // boolean
```
- Extracts `sessionId` from memo, computes `HMAC-SHA256(ZVS_SECRET_SEED, sessionId)`
- Takes first 4 bytes as big-endian u32, mod 1_000_000 → 6-digit OTP
- Requires `ZVS_SECRET_SEED` env var (throws if missing)

### confirmOtpAction.ts
Main server action for OTP verification. Stateless — verifies the HMAC, checks
address matches the profile, then applies edits.
```typescript
"use server"
const result = await confirmOtpAction(zcasherId, otp, memo, edits?);
// Success: { ok: true, data: { status: "verified" } }
// Failure: { ok: false, data: { status: "invalid" }, error: "Invalid verification code." }
```

On success, also handles:
- Setting `address_verified = true` and `last_verified_at`
- Profile field edits (name, display_name, bio, nearest_city_name)
- Avatar upload/removal (with history archival)
- Link create/update/delete

## Memo Format
```
DO NOT MODIFY:{zvs/{session_id},{user_address}}
```
- session_id: 16 ASCII digits
- user_address: Full unified Zcash address

## Security Notes
- OTP is deterministic (HMAC-SHA256) — same memo always produces same OTP
- Secret seed stored in `ZVS_SECRET_SEED` env var (required in production)
- Memo generation is server-side only — client cannot fabricate valid memos
- A forged memo would require knowing the secret seed to produce a matching OTP
- Attempt limiting is client-side UX only (5 tries) — not a security boundary
- Address mismatch check ensures the memo's embedded address matches the profile

## Flow Diagram
```
Client calls generateMemoAction(profileId, amount)
         ↓
    Server: generateSessionId() → buildZvsMemo() → buildZcashUri()
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
    Server: verifyOtp(memo, otp) — stateless HMAC check
         ↓
    Valid  → verify address matches profile → apply edits → { status: "verified" }
    Invalid → { status: "invalid" } (client tracks remaining attempts)
```
