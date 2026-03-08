# /ui/verification - ZVS Verification UI

## Purpose
Client-side components for the Zcash Verification System flow. Users generate a QR code,
send a Zcash transaction, and enter the 6-digit OTP they receive back.

## What the User Sees

### Step 1: Generate QR
User clicks "Verify" on their profile card, which opens the verification modal.
The modal auto-triggers QR generation via `generateMemoAction` server action.
A QR code appears with the `zcash:` URI. The user can save the QR as SVG,
show/hide the raw URI, and see contextual help text.

### Step 2: Send Transaction
User scans the QR code from their Zcash wallet (or copies the URI) and sends the
transaction. The memo is embedded in the URI. Amount input supports fiat conversion
(30+ currencies) and token selection.

### Step 3: Enter OTP
After the wallet processes the transaction, the user receives a 6-digit OTP in the
return memo. They enter it in a 6-box digit input (mobile-optimized, numeric keyboard).
Pressing Enter submits.

### Step 4: Result
- **Success**: Profile is verified, page reloads to reflect updated state.
- **Failure**: Error message with remaining attempt count. After 5 failed attempts,
  the QR is hidden and the user must generate a new one.

### Important
- Attempt limiting is **client-side only** (5 tries in React state). The server is
  stateless — it validates the HMAC on every call with no attempt tracking.
- Memo and URI are stored in React state only. If the user refreshes or navigates
  away, they must generate a new QR and send again.
- Profile edits from `useEditsStore` (Zustand) are submitted alongside the OTP
  via `confirmOtpAction`. Edits are applied atomically on successful verification.

## File -> Feature Map

| File | Feature |
|------|---------|
| `ProfileVerification.tsx` | Main flow: QR generation, OTP input, attempt tracking, submit to `confirmOtpAction` |
| `VerifyProfileModal.tsx` | Portal modal wrapper, auto-triggers QR generation on open |
| `OtpInput.tsx` | 6-digit code input with per-digit boxes, Enter-to-submit, error/disabled states |
| `QrUriBlock.tsx` | QR code display with save-as-SVG, show/hide URI toggle, collapsible tips |
| `AmountAndWallet.tsx` | Amount input with fiat conversion, currency selector, token selector, refund address |
| `HelpMessage.tsx` | Contextual help text for the verification flow |

## See Also
- `lib/verification/AGENT.md` — server-side OTP generation, HMAC verification, edit persistence
- `ui/profile/AGENT.md` — profile editor (where edits originate)
