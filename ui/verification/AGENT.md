# /ui/verification - OTP Verification UI

## Purpose
User interface for ZVS (Zcash Verification Service) based identity verification.
Users prove Zcash address ownership via OTP flow.

## ZVS Verification Flow
1. User sends a transaction to ZVS address with their profile ID in memo
2. ZVS replies with a 6-digit OTP via Zcash memo
3. User enters OTP in the directory UI
4. Backend validates OTP and updates Supabase

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
│  Step 1: Send to ZVS address        │
│  ┌─────────────┐                    │
│  │   QR CODE   │  Amount: 0.003 ZEC │
│  │             │  Memo: [profile_id]│
│  └─────────────┘                    │
├─────────────────────────────────────┤
│  Step 2: Receive OTP in wallet      │
│  [Check your wallet for OTP...]     │
├─────────────────────────────────────┤
│  Step 3: Enter OTP                  │
│  ┌───┬───┬───┬───┬───┬───┐         │
│  │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │         │
│  └───┴───┴───┴───┴───┴───┘         │
└─────────────────────────────────────┘
```

## Zcash Integration

### QR Code
```typescript
<QrUriBlock
  address="u1..."
  amount={0.003}
  memo={profileId}
/>
// Generates: zcash:u1...?amount=0.003&memo=...
```

## State Management

### store.ts (Zustand)
Verification and messaging state - colocated with components:
```typescript
import { useMessagingStore } from "@/ui/verification/store";

const { mode, setMode, verify, pollStatus } = useMessagingStore();
```

State includes:
- `mode` - Current mode (verification, swap, memo)
- `memo` / `amount` - Memo composition
- `verify` - Verification request data
- `poll*` - Polling status fields

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
