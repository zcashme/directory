# /ui/verification - ZVS Verification UI

## Purpose
User interface for ZVS (Zcash Verification System) based identity verification.
Users prove Zcash address ownership by sending a transaction with a deterministic OTP.

## ZVS Verification Flow
1. User clicks "Generate QR" → calls `generateMemoAction` server action
2. Server creates memo + URI, registers memo in in-memory store, returns both to client
3. Client stores memo + URI in React state, displays QR
4. User sends transaction to ZVS address with memo
5. Backend wallet receives tx, computes OTP from memo, sends ZEC back with OTP
6. User enters OTP in UI
7. Client calls `confirmOtpAction` with memo + OTP
8. Server checks memo is server-issued, verifies OTP, marks profile as verified
9. On 5th failed attempt, server invalidates memo and returns a new one

**Important:** Verification must be completed in one session. If user refreshes or navigates away, they must generate a new QR and send again.

## Components

| Component | File | Purpose |
|-----------|------|---------|
| `ProfileVerification` | ProfileVerification.tsx | Main verification flow — server-side QR generation + OTP input |
| `VerifyProfileModal` | VerifyProfileModal.tsx | Modal wrapper for ProfileVerification |
| `OtpInput` | OtpInput.tsx | 6-digit code input field |
| `QrUriBlock` | QrUriBlock.tsx | QR code with zcash: URI |
| `AmountAndWallet` | AmountAndWallet.tsx | Amount input + generate QR button |
| `HelpMessage` | HelpMessage.tsx | Contextual help text |

## Verification Flow UI

```
┌─────────────────────────────────────┐
│  Generate QR  (calls server action) │
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
│  "4 attempts remaining"             │
└─────────────────────────────────────┘
```

## Memo Format
```
zvs/{session_id},{user_address}
```
- `session_id`: 16 ASCII digits (generated server-side)
- `user_address`: User's Zcash unified address

## State Management

### Local React State (ProfileVerification)
```typescript
const [currentMemo, setCurrentMemo] = useState("");  // Memo from server
const [currentUri, setCurrentUri] = useState("");     // zcash: URI from server
const [qrVisible, setQrVisible] = useState(false);    // Show QR?
const [otp, setOtp] = useState("");                   // User's OTP input
const [isGenerating, setIsGenerating] = useState(false); // Server call in progress?
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

## Exhaustion Handling
When the server returns `status: "exhausted"` with `newMemo` + `newUri`:
- Client swaps `currentMemo` and `currentUri` to the new values
- OTP input is cleared
- QR code updates automatically
- User must send a new transaction with the new memo

## No DB Persistence
- Memo is stored in client React state only (no database)
- Server tracks memos in an in-memory store (for attempt counting + validation)
- If user leaves the page, they must start over
