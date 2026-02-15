# /ui/verification - ZVS Verification UI

## Purpose
User interface for ZVS (Zcash Verification System) based identity verification.
Users prove Zcash address ownership by sending a transaction with a deterministic OTP.

## ZVS Verification Flow
1. User clicks "Generate QR" → creates session with memo `zvs/{session_id},{u-address}`
2. Session stored in Supabase `verification_sessions` table
3. User sends transaction to ZVS address with memo
4. OTP is deterministically computed from memo using HMAC-SHA256
5. User enters OTP in UI (inline or via modal)
6. Backend verifies OTP, applies pending edits, deletes session

## Components

| Component | File | Purpose |
|-----------|------|---------|
| `ProfileVerification` | ProfileVerification.tsx | Main verification flow with QR + OTP input |
| `SubmitOtp` | SubmitOtp.tsx | Modal for late OTP entry |
| `OtpInput` | OtpInput.tsx | 6-digit code input field |
| `QrUriBlock` | QrUriBlock.tsx | QR code with zcash: URI |
| `AmountAndWallet` | AmountAndWallet.tsx | Amount input + generate QR button |
| `HelpMessage` | HelpMessage.tsx | Contextual help text |

## Verification Flow UI

```
┌─────────────────────────────────────┐
│  Generate QR                        │
│  ┌─────────────┐                    │
│  │   QR CODE   │  Amount: 0.003 ZEC │
│  │             │                    │
│  └─────────────┘                    │
│  Memo: zvs/1234567890123456,u1...   │
├─────────────────────────────────────┤
│  Enter OTP                          │
│  ┌───┬───┬───┬───┬───┬───┐         │
│  │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ [Submit]│
│  └───┴───┴───┴───┴───┴───┘         │
└─────────────────────────────────────┘
```

## Memo Format
```
zvs/{session_id},{user_address}
```
- `session_id`: 16 ASCII digits (randomly generated)
- `user_address`: User's Zcash unified address

Example:
```
zvs/2026021505421234,u1d9l0a8ldht9zcpkmppd8s9lpev724l5afh3dl9ds8...
```

## State Management

### store.ts (Zustand)
```typescript
import { useMessagingStore } from "@/ui/verification/store";

const {
  verify,           // { amount, zId, sessionId, userAddress }
  verifyQrEnabled,  // QR visible?
  verificationError,
  setVerify,
  setVerifyQrEnabled,
  resetVerification
} = useMessagingStore();
```

## Multiple Sessions
- Users can have multiple active verification sessions
- Each session has its own OTP (derived from unique memo)
- Sessions expire after 24 hours
- When OTP is entered, system finds the matching session and applies those edits

## Late OTP Entry
Users can enter OTP later via the "Enter Passcode" button in ProfileCard menu.
The `SubmitOtp` modal calls `confirmOtpAction` which searches all active sessions
for a matching OTP.
