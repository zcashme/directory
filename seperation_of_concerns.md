# Separation of Concerns Violations in `ui/`

## Critical Violations

### `ui/profile/ProfileCard.jsx`
- Direct Supabase query fetching links from `zcasher_links`
- `enrichLink()` — domain parsing / URL normalization logic
- OAuth verification flow (`startOAuthVerification`, `getLinkAuthToken`, etc.)
- Complex warning-state computation (verified address, duplicate names, link counts)
- Memory caching and global window event dispatch

### `ui/profile/ProfileEditor.jsx`
- Multiple Supabase CRUD calls (update links, fetch profile data)
- Direct `fetch()` to Discord, X, GitHub APIs for avatar retrieval
- 500+ lines of OAuth callback / session verification branching
- localStorage reads/writes for avatar caching
- Complex delta-tracking across 28 form fields

### `ui/signup/AddUserForm.jsx`
- Supabase `INSERT` into `zcasher` and `zcasher_links`
- Address format validation (transparent, sapling, unified, TEX regex)
- Duplicate name/address checking against profile list
- Global cache invalidation

## Moderate Violations

### `ui/signup/CitySearchDropdown.jsx`
- Direct Supabase query against `worldcities` on every keystroke (no debounce)

### `ui/verification/SubmitOtp.jsx`
- Direct Supabase RPC call (`confirm_otp_sql`)
- OTP status interpretation switch logic

## Already Acceptable

- `ZcashFeedbackDraft.jsx` / `ZcashFeedbackVerify.jsx` — use hooks from `lib/` already, minor concerns only
- `ProfilePageClient.jsx` — canvas favicon gen is page-level, acceptable

## Recommended Extractions

| Extract to | From |
|---|---|
| `lib/verification/useOtpVerification.js` | `SubmitOtp.jsx` |
| `lib/signup/useCitySearch.js` | `CitySearchDropdown.jsx` |
| `lib/profile/useProfileLinks.js` | `ProfileCard.jsx` |
| `lib/profile/useProfileWarnings.js` | `ProfileCard.jsx` |
| `lib/profile/useProfileVerification.js` | `ProfileEditor.jsx` |
| `lib/profile/useAvatarFetch.js` | `ProfileEditor.jsx` |
| `lib/signup/useAddUser.js` | `AddUserForm.jsx` |
| `lib/zcash/validateAddress.js` | `AddUserForm.jsx` |
| `lib/messaging/useExchangeRate.js` | (Phase 2 plan item) |
