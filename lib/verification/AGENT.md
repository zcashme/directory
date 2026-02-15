# /lib/verification - ZVS Verification Logic

## Purpose
Server-side logic for Zcash Verification System (ZVS). Users prove address ownership
by sending a transaction with a specific memo, then entering a deterministic OTP.

## How Verification Works

1. **Generate Session** - Create unique session_id, build memo, store in Supabase
2. **User sends transaction** - To ZVS address with memo in format `zvs/{session_id},{u-address}`
3. **OTP computed** - Deterministically from memo using HMAC-SHA256
4. **User enters OTP** - System finds matching session, applies pending edits
5. **Session deleted** - After successful verification

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
Requires `ZVS_SECRET_SEED` environment variable.

### verificationSessionAction.ts
Supabase CRUD for verification sessions.
```typescript
import {
  createVerificationSession,
  getVerificationSessions,
  deleteVerificationSession
} from "./verificationSessionAction";

// Create new session (multiple per user allowed)
await createVerificationSession(zcasherId, sessionId, memo, pendingEdits);

// Get all active sessions for user
const { sessions } = await getVerificationSessions(zcasherId);

// Delete after successful verification
await deleteVerificationSession(sessionId);
```

### confirmOtpAction.ts
Main server action for OTP verification.
```typescript
'use server'
import { confirmOtpAction } from "./confirmOtpAction";

const result = await confirmOtpAction(zcasherId, otp);
// Finds matching session, applies edits, returns { ok, data, error }
```

### updateLinkVerificationAction.ts
Marks individual social links as verified (separate OAuth flow).

## Database Schema

### verification_sessions table
```sql
CREATE TABLE verification_sessions (
  id SERIAL PRIMARY KEY,
  zcasher_id INTEGER NOT NULL,
  session_id TEXT UNIQUE NOT NULL,
  memo TEXT NOT NULL,
  pending_edits JSONB DEFAULT '{}',
  attempts_remaining INTEGER DEFAULT 3,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Required Supabase RPC
```sql
-- apply_pending_edits_sql(in_zcasher_id, in_session_id, in_pending_edits)
-- Applies pending_edits to the zcasher profile
-- Marks address as verified
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
- Sessions expire after 24 hours
- Secret seed stored in `ZVS_SECRET_SEED` env var
- Multiple sessions per user allowed (last-write-wins for conflicting edits)

## Flow Diagram
```
User clicks "Generate QR"
         ↓
    generateSessionId() → buildZvsMemo()
         ↓
    createVerificationSession() → Supabase
         ↓
    Display QR with zcash: URI
         ↓
    User sends transaction with memo
         ↓
    User enters OTP (computed from memo)
         ↓
    confirmOtpAction()
         ↓
    getVerificationSessions() → find matching OTP
         ↓
    apply_pending_edits_sql() → update profile
         ↓
    deleteVerificationSession() → cleanup
```
