# Profile Editor: End-to-End Technical README

This document explains how the profile editor works, how edits are staged, how OTP verification applies those edits, and exactly which database/storage resources are touched.

Primary implementation files:
- `ui/profile/ProfileEditor.tsx`
- `ui/profile/store.ts`
- `ui/verification/ProfileVerification.tsx`
- `lib/verification/generateMemoAction.ts`
- `lib/verification/confirmOtpAction.ts`
- `lib/verification/memoStore.ts`
- `lib/verification/session.ts`

## 1. High-Level Flow

1. User opens profile edit mode (inside `ProfileCard` flow on `app/[slug]/ProfilePage.tsx`).
2. `ProfileEditor` mutates local Zustand state (`useEditsStore`) only. No immediate DB writes.
3. User clicks `Start Verification`.
4. Parent triggers `ProfileVerification` to generate a server-issued memo/URI.
5. User sends a Zcash transaction to the verification address with the generated memo.
6. User enters OTP.
7. `confirmOtpAction` validates memo + OTP, verifies address match, then applies staged edits to DB/storage.
8. UI reloads after success.

Important: profile edits are persisted only after OTP verification succeeds.

## 2. Component Responsibilities

## 2.1 `ProfileEditor`

Responsibilities:
- Renders editable profile fields.
- Manages client-side validation and deletion markers.
- Pre-validates pending avatar uploads (type, size, dimensions, animated GIF rejection).
- Normalizes and edits link rows.
- Calls `onGenerateQr` only when address is verification-eligible.

Does not:
- Write directly to Supabase tables/storage.
- Verify OTP.

## 2.2 `ProfileVerification`

Responsibilities:
- Builds a minimal `ProfileEditsPayload` diff from `useEditsStore`.
- Requests memo/URI from server (`generateMemoAction`).
- Submits OTP + edits (`confirmOtpAction`).
- Handles exhausted memo retries and refreshes page on success.

## 2.3 `useEditsStore` (`ui/profile/store.ts`)

State slices:
- `form`: live editable values.
- `original`: baseline loaded from current profile.
- `deletedFields`: booleans for field-level delete intent.
- `pendingAvatarUpload`: validated image payload to apply after OTP.

Key behavior:
- `setDeletedField(field, true)` clears corresponding value in `form`.
- `setDeletedField(field, false)` restores value from `original`.
- Special-case for nearest city: uses `nearest_city` flag to control `form.nearest_city_name`.

## 3. Field Behavior Details

## 3.1 Address

- Validation via `validateZcashAddress`.
- `Start Verification` is disabled unless address is non-empty, valid, and not transparent/TEX.
- Delete gating:
  - If profile is unverified, delete is blocked with popup.
  - Reset is allowed once a delete state is active.
- Entering a new non-empty value auto-clears deletion state.

## 3.2 Username

- Input shown as `Zcash.me/{name}` plus immutable `-{id}` suffix for unverified usernames.
- Availability checked via `checkUsernameAvailabilityAction` (debounced).
- Delete action asks for confirmation.
- If marked deleted, warning is shown in-field.
- Entering a new non-empty value auto-clears deletion marker.

## 3.3 Display Name, Bio, Nearest City

- All support delete/reset markers with inline warning.
- When marked deleted:
  - field value is cleared,
  - placeholder is also suppressed.
- Reset restores stored value from `original`.
- Entering/selecting a new non-empty value auto-clears deletion marker.

Bio specifics:
- `maxLength={100}` (character cap in textarea).
- Visual counter is byte-based (`TextEncoder`) with memo-style progress icon/countdown.

## 3.4 Profile Image

- Upload accepted types: JPG, PNG, GIF.
- Client pre-checks:
  - size <= 2 MB,
  - valid data URL parse,
  - dimensions readable,
  - GIF must be non-animated.
- Upload is not sent immediately; it is staged in `pendingAvatarUpload`.
- Delete toggle marks image for removal and clears pending upload.
- In delete state, warning is shown.

## 3.5 Links

Each row has an internal `_uid` for UI identity and optional DB `id`.

Delete semantics:
- Unsaved link (`id === null`): delete removes row immediately (no warning).
- Persisted link (`id !== null`): delete toggles `_delete` marker and shows in-box warning.
- Reset restores original link set.

Verification/auth links:
- Existing unverified persisted links can show `Authenticate` action if callback is provided.
- Marked-for-deletion links hide authenticate action.

## 4. OTP + Verification Mechanics

## 4.1 Memo generation (`generateMemoAction`)

Server-side steps:
1. Validate amount (`MIN_AMOUNT = 0.001`).
2. Query `zcasher` for profile address.
3. Create session ID and memo string (`zvs/{16-digit-session},{userAddress}`).
4. Build `zcash:` URI to fixed verification address (`SIGNIN_ADDR`) with base64url memo.
5. Register memo in in-memory store with attempts metadata.

## 4.2 Memo store (`memoStore.ts`)

- In-memory `Map<string, MemoEntry>`.
- TTL: 30 minutes.
- Max OTP attempts: 5.
- Exhausted memo is removed and treated as invalid afterwards.

## 4.3 OTP confirmation (`confirmOtpAction`)

Validation order:
1. Validate inputs.
2. Ensure memo exists and is server-issued (memo store hit).
3. Verify OTP from memo.
4. On OTP failure:
   - increment attempt count,
   - on exhaustion, issue fresh memo/URI automatically.
5. On OTP success:
   - remove memo from store,
   - parse memo and verify memo address matches current DB profile address,
   - apply profile/link/image edits.

## 5. Database and Storage Writes

## 5.1 Tables touched

Primary tables in this flow:
- `zcasher` (profile core fields)
- `zcasher_links` (profile links)

Read path also commonly uses:
- `zcasher_searchable` (for directory/search display elsewhere)

## 5.2 `zcasher` updates in `confirmOtpAction`

Always sets:
- `address_verified = true` on successful OTP.

Conditionally sets:
- `name`, `display_name`, `bio`, `nearest_city_name`
- `profile_image_url` (new URL, plain URL edit, or `null` when removed)

Note:
- `ProfileVerification` sends only changed fields (diff against `original`).

## 5.3 `zcasher_links` updates in `confirmOtpAction`

For each link edit:
- delete (`_delete: true` + `id`): `DELETE ... WHERE id AND zcasher_id`
- update (`id` and not delete): updates `url`, `label`, `platform`
- insert (no `id` and not delete): inserts with `is_verified: false`

## 5.4 Avatar storage details

Storage constants:
- bucket: `zcashme`
- folder: `avatar_uploads`

Behavior:
1. Existing avatar variants are removed by prefix (`{profileId}_avatar` and `{profileId}_avatar.*` under `avatar_uploads/`).
2. New avatar is uploaded to `avatar_uploads/{profileId}_avatar` with `upsert: true`.
3. Public URL is generated and cache-busted via query param `?v={timestamp}`.
4. `zcasher.profile_image_url` is set to that URL.

Delete image flow:
- remove matching storage objects first,
- then set `profile_image_url = null`.

## 6. Payload Contract Between Editor and Verification

`ProfileVerification.buildEditsPayload()` emits:
- scalar field changes,
- `remove_profile_image` and/or `avatar_upload`,
- link edits (`insert`, `update`, `delete`).

Link deletion detection:
- persisted links marked `_delete` become `_delete: true` edits,
- removed persisted links are also treated as deletes (defensive fallback),
- unsaved rows removed in UI do not produce delete edits (no DB record exists).

## 7. Warning/Reset UX Contract

For fields with delete support:
- `Delete` toggles to `Reset`.
- Warning appears while deletion marker is active.
- Reset restores original value from store baseline.

Auto-unmark rule:
- If a field is marked deleted and user enters/selects a non-empty replacement, delete marker is cleared automatically and warning disappears.

Applied to:
- address
- username
- display name
- bio
- nearest city

Links:
- only persisted links use mark/delete warning flow.
- unsaved links are removed immediately on delete.

## 8. Error and Partial-Failure Behavior

- If profile core update fails: action returns error; no success state.
- Link edits run after profile core update.
- If profile verified but some link edits fail:
  - response is `ok: false` with status `"verified"` and aggregated link errors,
  - this means verification/profile update may already be committed while some link operations failed.

Implication:
- link writes are not wrapped in an all-or-nothing transaction with profile update in this action.

## 9. Current Constraints and Implementation Notes

- OTP memo issuance is in-memory. In multi-instance deployments, memo store consistency requires sticky routing or shared backing store.
- UI warning text for username delete says profile will be removed; this server action directly updates fields and does not explicitly delete `zcasher` row in this file.
- `ProfileVerification` uses `QR_AMOUNT_ZEC = "0.004"` while helper text says minimum 0.002 and server minimum check is 0.001.
- Some legacy text/encoding artifacts exist in UI labels elsewhere; behavior above reflects current code path.

## 10. Quick Sequence (Concrete)

1. `ProfileEditor` mutates `useEditsStore.form`.
2. User clicks `Start Verification`.
3. `ProfilePage` increments `verificationGenerateQrTrigger`.
4. `ProfileVerification` calls `generateMemoAction(profile.id, "0.004")`.
5. Server returns memo + URI; user sends tx.
6. User enters OTP; client calls:
   - `confirmOtpAction(profile.id, otp, memo, editsPayload)`
7. Server validates OTP/memo/address, applies:
   - `zcasher` update,
   - storage avatar operations (if needed),
   - `zcasher_links` mutations.
8. Client reloads page on success.

