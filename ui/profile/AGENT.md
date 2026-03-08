# /ui/profile - Profile Card & Editor Components

## Purpose
React components for displaying and editing Zcash profiles. The profile card is the
central UI element on zcash.me/:username — it shows the user's identity, links, and
Zcash address, and flips to reveal a full editor on the back.

## What the User Sees

### Profile Card (Front)
A card showing: avatar (or animated smiley fallback with blinking eyes), display name
with verified badge, username, bio (2-line clamp), Zcash address with copy + QR buttons,
and social links with authentication badges. A three-dot menu offers: Show/Hide Awards,
Edit Profile, Verify Profile, Upgrade to Maxi, Copy Referral Link, Share Profile.

Below the links, a trust warning banner may appear (red/yellow/green/neutral) based on
verification status, duplicate names, and link counts. The card background has tier-based
styling — golden glow for featured profiles, green shimmer for 3+ verified items, blue
tint for 1, gray for 0.

### Profile Card (Back — Editor)
Clicking "Edit Profile" flips the card with a 3D animation. The back shows editable fields:
- **Avatar**: File upload (JPG/PNG, max 2 MB) with preview
- **Zcash Address**: Text input with validation
- **Username**: Real-time availability check (debounced 250ms), locked suffix if unverified
- **Display Name**: Text input with deletion support
- **Bio**: Textarea with 100-byte limit and visual progress ring
- **City**: Autocomplete dropdown
- **Links**: Add/remove/reorder, social username normalization, authenticated links are read-only

"Start Verification" button at the bottom submits all edits through the ZVS verification
flow (see `ui/verification/AGENT.md`).

### Navigation Header
Sticky header on every page with: logo, live search dropdown (debounced 150ms, `cmdk` library),
and "Join" button. Search shows results with avatars and verified badges. The Join button
opens the signup form, supporting referral pre-fill via URL params (`join=1`, `referred_by`).
Hidden on `/ns` routes.

### Compact Views
`ProfileCardContent` — reusable card renderer for directory/leaderboard contexts (3 size variants).
`ProfileCardListView` — single-row list item for rankings with avatar, name, badges, and rank.

### Maxi Upgrade [WIP]
Premium tier promotion modal listing features (priority placement, gold badge, referral
commissions, custom themes) at 1 ZEC. Payment flow (QR + OTP) is stubbed — server actions
not yet implemented.

## State Management
- **`store.ts` (Zustand)**: Profile editing state — form values, original snapshot, deleted
  fields, pending avatar upload with metadata. All edits are batched here and submitted
  through verification.
- **`useProfileLinks.ts`**: Hook managing enriched link array from profile data.
- **Local state in ProfileCard**: Flip state, modal visibility, QR visibility.

## File -> Feature Map

| File | Feature |
|------|---------|
| `ProfileCard.tsx` | Main card with 3D flip between display/edit, menu, modals |
| `ProfileCardContent.tsx` | Reusable card body for directory/leaderboard views (mobile/default/compact) |
| `ProfileCardActions.tsx` | Three-dot menu with profile actions |
| `ProfileCardListView.tsx` | Compact list item for directory/leaderboard rankings |
| `ProfileCardWarning.tsx` | Expandable trust warning banner (tone-based: red/yellow/green/neutral) |
| `profileCardTypes.ts` | TypeScript interfaces for card components |
| `profileCardUtils.ts` | `formatUsername()`, `resolveIconSrc()` |
| `ProfileEditor.tsx` | Full edit interface: all fields, link management, avatar upload, bio counter |
| `ProfileField.tsx` | Reusable field wrapper with label, help tooltip, delete/reset button |
| `ProfileAvatar.tsx` | Avatar image with animated smiley fallback (blinking eyes, random look-around) |
| `ProfileHeader.tsx` | Sticky nav header with search + Join button |
| `ProfileSearchDropdown.tsx` | `cmdk`-based search with live results, username availability banner |
| `ProfileLinkRow.tsx` | Single link row with icon, label, auth badge, click-to-verify |
| `VerifiedBadge.tsx` | Expandable checkmark badge (green=verified, gray=unverified), auto-collapse |
| `VerifiedCardWrapper.tsx` | Tier-based card background (gold/green shimmer/blue/gray) |
| `store.ts` | Zustand store for profile edits (form, original, deletedFields, pendingAvatarUpload) |
| `useProfileLinks.ts` | Hook: enriches and manages link array state |
| `editorModals.tsx` | `RedirectModal` — full-screen spinner during OAuth redirect |
| `MaxiUpgrade.tsx` | [WIP] Maxi payment flow: QR + OTP (server actions not yet implemented) |
| `UpgradeToMaxiModal.tsx` | [WIP] Premium tier promotion modal with features + pricing |

## See Also
- `lib/profile/AGENT.md` — profile types, fetching, validation, avatar storage
- `lib/verification/AGENT.md` — OTP verification and edit persistence
- `ui/verification/AGENT.md` — QR code and OTP input components
- `ui/links/AGENT.md` — OAuth link authentication flow
