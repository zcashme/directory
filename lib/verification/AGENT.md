# /lib/verification - OTP Verification

## Purpose
On-chain verification using Zcash transaction memos. Users prove address ownership
by sending a small transaction with an OTP code in the memo field.

## How Verification Works

1. **Generate OTP** - Server creates 6-digit code
2. **User sends transaction** - To their own address with OTP in memo
3. **Blockchain scan** - External service monitors for matching memo
4. **Confirmation** - Profile marked as verified

## Key Files

### confirmOtpAction.ts
Server action to confirm OTP verification.
```typescript
'use server'
export async function confirmOtpAction(
  profileId: string,
  otp: string
): Promise<{ success: boolean; error?: string }>
```

Calls external verification API at `NEXT_PUBLIC_VERIFY_API_URL`.

### confirmOtp.ts
Client-side helper for calling the server action.

### updateLinkVerificationAction.ts
Marks individual links as verified after proof.

## External Verification Service
The actual blockchain scanning runs externally:
- Watches Zcash shielded pool for transactions
- Decodes memo fields
- Matches OTPs to pending verifications
- Calls back to update database

Environment: `NEXT_PUBLIC_VERIFY_API_URL`

## Zcash Memo Field
- Max 512 bytes
- Encoded as base64url in URI
- Format: `{"otp":"123456"}` or with edits
- Must be shielded transaction for privacy

## Testing Harness
- Mock the external verification API
- Test OTP generation/validation locally
- Integration test with testnet transactions

## Security Notes
- OTPs expire after 10 minutes
- One-time use only
- Rate limited to prevent brute force
- Never log OTP values

## Flow Diagram
```
User → Generate OTP → Build URI → QR Code
         ↓
      Send tx with memo
         ↓
External Service → Scan blockchain → Match OTP
         ↓
      confirmOtpAction → Update DB → Profile verified
```
