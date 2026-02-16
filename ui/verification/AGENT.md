# /ui/verification - ZVS Verification UI

## Purpose
User interface for ZVS (Zcash Verification System) based identity verification.
Users prove Zcash address ownership by sending a transaction with a deterministic OTP.

## ZVS Verification Flow
1. User clicks "Generate QR" → creates memo `zvs/{session_id},{u-address}` (stored in React state)
2. User sends transaction to ZVS address with memo
3. Backend wallet receives tx, computes OTP from memo, sends ZEC back with OTP
4. User enters OTP in UI
5. Client sends memo + OTP to server, server verifies and marks profile as verified

**Important:** Verification must be completed in one session. If user refreshes or navigates away, they must generate a new QR and send again.

## Components

| Component | File | Purpose |
|-----------|------|---------|
| `ProfileVerification` | ProfileVerification.tsx | Main verification flow with QR + OTP input |
| `VerifyProfileModal` | VerifyProfileModal.tsx | Modal wrapper for ProfileVerification |
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

### Local React State (ProfileVerification)
```typescript
const [currentMemo, setCurrentMemo] = useState("");  // Memo for current session
const [currentUri, setCurrentUri] = useState("");    // zcash: URI with memo
const [qrVisible, setQrVisible] = useState(false);   // Show QR?
const [otp, setOtp] = useState("");                  // User's OTP input
```

### store.ts (Zustand) - for cross-component state
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

## No Persistence
- Memo is stored in React state only (no database)
- If user leaves the page, they must start over
- This simplifies the flow and encourages immediate verification
