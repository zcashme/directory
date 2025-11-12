# ZcashFeedback refactor plan (verify mode)

## Goals
- Isolate verify and draft flows
- Remove fragile window event wiring from the view
- Centralize wallet URI and QR helpers
- Make state shape explicit for each mode

## New files to add
- src/utils/zcashWalletUtils.js
  - buildZcashUri(address, amount, memo)
  - toBase64Url(text)
  - isValidZcashAddress(addr)
- src/hooks/useFeedbackEvents.js
  - subscribe to enterSignInMode and enterDraftMode
  - expose activeZId, latest payload, and mode setters
- src/hooks/useFeedbackController.js
  - derive memo text with buildZcashEditMemo
  - compute display state for both modes
  - small actions: copyUri, openWallet, clearDraft
- src/feedback/ZcashFeedbackDraft.jsx
  - recipient search
  - editable memo and amount
  - QR preview toggle
- src/feedback/ZcashFeedbackVerify.jsx
  - sign in memo preview (read only)
  - min amount guard
  - one time passcode input and submit action
  - QR and wallet buttons
- src/feedback/index.js
  - re-exports for clean imports

## Store updates (src/store.js)
Structure:
feedback: {
  mode: "note" | "signin",
  selectedAddress: string | "other",
  forceShowQR: boolean,
  draft: { memo: string, amount: string },
  verify: { zId: string|null, memo: string, amount: string }
  pendingEdits: { profile: {}, l: string[] }
}
Actions:
- setMode(mode)
- setSelectedAddress(addr)
- setForceShowQR(flag)
- setDraftMemo(v), setDraftAmount(v)
- setVerifyId(zId), setVerifyMemo(v), setVerifyAmount(v)

## ZcashFeedback.jsx (controller)
- Import useFeedbackEvents and useFeedbackController
- Render <ZcashFeedbackDraft/> or <ZcashFeedbackVerify/> based on store.mode
- Remove direct DOM queries for [data-active-profile] if possible
- Keep the floating button and section anchor

## Integration notes
- Directory.jsx keeps setting selectedAddress via store
- ProfileCard.jsx continues to dispatch enterSignInMode and enterDraftMode
- Verify view reads cachedProfiles through useProfiles for display only

## Migration steps
1) Add utils file and replace local helpers
2) Add hooks and move event listeners there
3) Add Draft and Verify components and move JSX per mode
4) Update store shape and calls in all touched files
5) Slim ZcashFeedback.jsx to a controller
6) Manual test checklist below

## Manual test checklist
- Select a card then click Verify
  - Verify view shows read only memo with {z:..., a:...}
  - Amount field default equals MIN_SIGNIN_AMOUNT
  - QR shows and Open in Wallet opens zcash URI
- Click Draft
  - Draft view shows editable memo and amount
  - QR shows only when valid address and inputs are present
- Recipient search still finds profiles
- Copy URI button works in both modes
- Window events flip modes correctly

## Rollback plan
- Checkout main, create fix branch, revert the refactor commits
