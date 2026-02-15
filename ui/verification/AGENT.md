# /ui/verification - OTP Verification UI

## Purpose
User interface for blockchain-based identity verification. Users prove
Zcash address ownership by sending a transaction with an OTP in the memo.

## Components

### Main Flow
| Component | File | Purpose |
|-----------|------|---------|
| `ProfileVerification` | ProfileVerification.tsx | Main verification container |
| `OtpInput` | OtpInput.tsx | 6-digit code input |
| `SubmitOtp` | SubmitOtp.tsx | Submit button with loading |
| `QrUriBlock` | QrUriBlock.tsx | QR code with zcash: URI |
| `AmountAndWallet` | AmountAndWallet.tsx | Transaction details |
| `ProgressStep` | ProgressStep.tsx | Multi-step progress |
| `HelpMessage` | HelpMessage.tsx | Contextual help |
| `InlineOtpForm` | InlineOtpForm.tsx | Compact inline form |

## Verification Flow UI

```
┌─────────────────────────────────────┐
│  Step 1: Enter OTP                  │
│  ┌───┬───┬───┬───┬───┬───┐         │
│  │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │         │
│  └───┴───┴───┴───┴───┴───┘         │
├─────────────────────────────────────┤
│  Step 2: Scan QR or Copy URI        │
│  ┌─────────────┐                    │
│  │   QR CODE   │  Amount: 0.0001 ZEC│
│  │             │  Memo: [OTP]       │
│  └─────────────┘                    │
├─────────────────────────────────────┤
│  Step 3: Send & Confirm             │
│  [Waiting for transaction...]       │
│  ████████░░░░░░░░ Polling...        │
└─────────────────────────────────────┘
```

## Zcash Integration

### QR Code
```typescript
<QrUriBlock
  address="u1..."
  amount={0.0001}
  memo={otp}
/>
// Generates: zcash:u1...?amount=0.0001&memo=MTIzNDU2
```

### Memo Encoding
OTP is base64url encoded in the memo field:
- `123456` → `MTIzNDU2`
- Max 512 bytes in Zcash memo

## Hooks

### useOtpFlow.ts
Manages OTP generation and state.

### useVerificationFlow.ts
Full verification flow state machine.

### useVerificationPolling.ts
Polls server for transaction confirmation.

## Testing Harness
- Mock the verification API responses
- Test OTP input validation
- Simulate polling states
- QR codes can be visually verified

## Messages
`otpMessages.ts` contains user-facing copy:
- Error messages
- Help text
- Status updates
