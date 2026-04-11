# Handoff

## Feature: New Profile Verification Reminder Banner

After a user creates a new profile, show a blue banner on their profile page reminding them their Zcash address is unverified, with a CTA to start the OTP verification flow.

---

## Steps

### Step 1 — Lift Join Modal State out of ProfileHeader ✅ Done
Modal state (`isJoinOpen`, `prefillUsername`, `prefillReferrer`) moved into `JoinModalContext`. `AddUserForm` moved to root layout. ProfileHeader now only calls `openJoin()`.

### Step 2 — Server-Side Referral Validation ✅ Done
`app/page.tsx` reads `searchParams` server-side (lines 24-48). Validates that the referrer exists in the DB. Passes clean, trusted referral data down to `HomePage` → `openJoin()`.

### Step 3 — Replace `window.location.assign()` with `router.push()` ✅ Done
`AddUserForm.tsx` line 478 uses `router.push()` for navigation to the new profile page. React state is preserved during navigation so context survives the redirect.

### Step 4 — Banner Signal from Modal Close ✅ Done
`JoinModal.tsx` line 17 passes `onUserAdded={(profile) => notifyCreated(buildSlug(profile))}` to `AddUserForm`. When form submits successfully:
1. `notifyCreated(slug)` sets `justCreatedSlug` in context
2. `closeJoin()` closes the modal
3. `ProfilePage` detects `justCreatedSlug` match and shows banner

### Step 5 — Blue Verification Reminder Banner ✅ Done
`ProfilePage.tsx` lines 209-216:
- Detects newly created profile via `justCreatedSlug === buildSlug(initialProfile)`
- Only shows if `!initialProfile.address_verified`
- Blue styling: `bg-blue-50`, `border-blue-200`, `text-blue-900`
- CTA button triggers `setIsProfileEditing(true)` + `handleGenerateVerificationQr()`
- Dismissible via X button
- Auto-clears `justCreatedSlug` from context via `clearJustCreated()`

---

## Display Name Validation ✅ Done (32 char max)

**Data Analysis:**
- 268 profiles with display names in database
- 99.6% of users have names ≤ 30 chars (76.5% under 10 chars)
- Max legitimate: 30 chars ("Ser Niccolo Soroushianno VII")
- 1 outlier deleted: "lollipop" entry with 178-char Zcash address as display_name

**Validation Rules (32 chars):**
| Rule | Implementation |
|------|----------------|
| Max length | 32 characters (covers 99.6% of users) |
| Min length | 1 character (if provided) |
| Strip newlines | Yes - control chars rejected |
| Allow unicode | Yes - accents, international chars |
| Allow emoji | Yes - ~1% of users use them |
| Trim whitespace | Yes - automatically trimmed |

**Files Modified:**
- `ui/signup/AddUserForm.tsx` - Added `validateDisplayName()` function + real-time validation
- `ui/profile/ProfileEditor.tsx` - Added display name validation with error display

---

## Files Modified

| File | Purpose |
|------|---------|
| `ui/signup/JoinModalContext.tsx` | Holds modal state + `justCreatedSlug` signal |
| `ui/signup/JoinModal.tsx` | Bridge: passes `notifyCreated` callback to form |
| `ui/signup/AddUserForm.tsx` | Calls `onUserAdded`, display name validation (32 chars max) |
| `app/page.tsx` | Server-side referral validation from `searchParams` |
| `app/HomePage.tsx` | Consumes `initialJoinParams`, calls `openJoin()` |
| `app/[slug]/ProfilePage.tsx` | Reads `justCreatedSlug`, renders verification banner |
| `app/layout.tsx` | Wraps app in `JoinModalProvider`, renders `<JoinModal />` |
| `ui/profile/ProfileEditor.tsx` | Display name validation in edit mode |

---

## Flow Summary

1. User visits `/?join=1&referred_by_id=123` → server validates referrer → `HomePage` opens join modal with prefill
2. User completes 6-step signup form → `AddUserForm` calls `createProfileAction` → success
3. `onUserAdded` callback → `notifyCreated(slug)` → `justCreatedSlug` stored in context → modal closes
4. `router.push(/${slug})` navigates to new profile page
5. `ProfilePage` detects `justCreatedSlug` matches current profile → shows blue verification banner
6. User clicks "Verify now" → enters verification mode → banner disappears

---

## Database Cleanup

- Deleted entry id: 2141 ("lollipop") with 178-char display_name containing a Zcash unified address
