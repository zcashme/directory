# /lib/verification - ZVS Address Verification

## Purpose
Server-side logic for the Zcash Verification System (ZVS). Users prove address ownership
by sending a Zcash transaction with a server-generated memo, then entering the 6-digit OTP
they receive back. Also handles profile edit persistence (edits are applied on successful verification).

## What the User Experiences

### Verifying Their Address
1. User clicks "Verify" on their profile card
2. Server generates a memo containing a session ID + user's address, and a `zcash:` URI
3. User scans the QR code (or copies the URI) and sends the transaction from their wallet
4. The ZVS backend wallet receives the transaction, computes an OTP from the memo, and sends ZEC back with the OTP in the return memo
5. User enters the 6-digit OTP they see in their wallet
6. Server recomputes the HMAC from the memo, compares it to the user's input
7. On match: profile is marked verified, any pending edits are applied

### Editing Their Profile
Profile edits (name, display name, bio, city, avatar, links) are batched and submitted
alongside the OTP. `confirmOtpAction` applies all edits atomically on successful verification.
This means every profile edit requires a verification transaction.

## Architecture: Stateless HMAC

OTP verification is **fully stateless** — no in-memory store, no database lookups for memo
tracking. The OTP is deterministic: `HMAC-SHA256(ZVS_SECRET_SEED, sessionId)` → first 4 bytes
as big-endian u32 → mod 1,000,000 → zero-padded 6-digit code.

Only the server knows `ZVS_SECRET_SEED`, so a forged memo produces the wrong OTP. The crypto
itself proves the memo is legitimate. This is critical for Vercel serverless where each function
invocation may run on a different instance.

Attempt limiting (5 tries) is enforced **client-side only** as a UX guardrail. It resets when
a new QR is generated. See `ui/verification/AGENT.md`.

## Memo Format
```
DO NOT MODIFY:{zvs/{session_id},{user_address}}
```
- Standard verification: 16-digit session ID
- Maxi upgrade: 24-digit session ID

## Database

| Table | Access |
|-------|--------|
| `zcasher` | Read address for memo generation; Write `address_verified`, `last_verified_at`, `first_verified_at`, profile fields, avatar |
| `zcasher_links` | Write — create/update/delete links on successful verification |
| `zcasher_verifications` | Write — append-only verification snapshot (audit trail + reward calculations) |

### Reward Snapshot
On successful verification, `confirmOtpAction` also records a verification snapshot for the
referral reward program: referrer ID, commission rate at verification time, verified link count,
and reward amount in zats. The commission rate is locked at this moment (not recalculated later).

## File -> Feature Map

| File | Feature |
|------|---------|
| `session.ts` | `generateSessionId()` (16 or 24 digits), `buildZvsMemo()`, `parseZvsMemo()`, `parseMaxiZvsMemo()` |
| `otp.ts` | `generateOtp()` and `verifyOtp()` — HMAC-SHA256 OTP generation/verification |
| `generateMemoAction.ts` | Server action: generates memo + `zcash:` URI for a profile (min 0.002 ZEC) |
| `confirmOtpAction.ts` | Server action: verifies OTP, applies profile edits (fields + avatar + links), records reward snapshot |

## See Also
- `ui/verification/AGENT.md` — QR code display, OTP input, attempt tracking UI
- `ui/profile/AGENT.md` — profile editor (where edits originate before verification)
- `lib/profile/AGENT.md` — avatar storage used by confirmOtpAction
