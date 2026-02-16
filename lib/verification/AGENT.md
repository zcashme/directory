# /lib/verification - ZVS Verification Logic

## Purpose
Server-side logic for Zcash Verification System (ZVS). Users prove address ownership
by sending a transaction with a specific memo, then entering a deterministic OTP.

## How Verification Works

1. **Generate QR** - Create unique session_id, build memo (stored in React state only)
2. **User sends transaction** - To ZVS address with memo in format `zvs/{session_id},{u-address}`
3. **Backend wallet receives tx** - Decrypts memo, computes OTP, sends ZEC back with OTP in memo
4. **User enters OTP** - Client sends memo + OTP to server for verification
5. **Profile verified** - Server recomputes OTP from memo, marks profile as verified

## Key Files

### session.ts
Session ID generation and memo building.
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
Main server action for OTP verification (stateless - no DB sessions).
```typescript
'use server'
import { confirmOtpAction } from "./confirmOtpAction";

// Client passes memo from React state + OTP from user input
const result = await confirmOtpAction(zcasherId, otp, memo);
// Verifies OTP matches memo, marks profile as verified
// Returns { ok, data, error }
```

### updateLinkVerificationAction.ts
Marks individual social links as verified (separate OAuth flow).

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
- No server-side session storage - memo lives in client React state only
- If user refreshes/navigates away, they must generate a new QR and send again

## Flow Diagram
```
User clicks "Generate QR"
         ↓
    generateSessionId() → buildZvsMemo()
         ↓
    Store memo in React state (NO database)
         ↓
    Display QR with zcash: URI
         ↓
    User sends transaction with memo
         ↓
    Backend wallet receives tx, computes OTP, sends back
         ↓
    User sees OTP in wallet, enters it
         ↓
    confirmOtpAction(zcasherId, otp, memo)
         ↓
    Server verifies: generateOtp(memo) === otp
         ↓
    Update zcasher.verified = true
```
