# Profile Card Test App

Standalone Next.js test harness (port 4000) for developing the zcash.me profile card in isolation. Imports components from the parent project via `@` webpack alias.

## Current Status: BROKEN

The app renders but styling/layout is completely unstyled — all content displays as raw unstyled text/images with no card layout, no spacing, and no visual hierarchy (see screenshot).

## Features Being Tested

### Profile Card (`ProfileCard.jsx`)
- **Profile avatar** with animated gradient backgrounds and fallback SVG face
- **Verified/unverified badge** — interactive, expands on hover/touch
- **Verified card wrapper** — tier-based styling with animated gradient shimmer for top-tier profiles
- **Joined date & verification status** display
- **Zcash address** with truncation, QR code toggle, and copy-to-clipboard
- **Social links tray** — lazy-loaded from Supabase, enriched with icons/metadata
- **Link authentication status** — Authenticated / Not Authenticated badges per link
- **Auth explainer modal** — explains authentication and provides action buttons
- **Referral rank badges** (alltime, weekly, monthly) with animations
- **Duplicate name warning** detection
- **3D flip card** — front shows profile, back shows ProfileEditor
- **Share button**

### Profile Editor (`ProfileEditor.jsx`)
- Edit all profile fields (address, name, display name, bio, image URL)
- Nearest city search and selection
- Social media link management with OAuth verification
- Avatar import from Discord, X, GitHub
- Link authentication flow with pending edits
- Field deletion with undo

### Profile Header (`ProfileHeader.jsx`)
- Search input for finding profiles
- Profile count display
- Join button for new users
- Search dropdown with ranked filtering and avatars

### Data Layer
- `fetchProfileForSlug()` — queries Supabase, merges referrer ranking data
- `useProfileLinks()` — lazy-loads and enriches social links
- `useProfileEvents()` — manages flip card state via custom events
- `useFeedback()` — selected address, pending edits, QR display state

### CSS / Animations (`globals.css`)
- Custom color variables (`--color-background`, `--color-card`, `--color-primary`)
- Zebra stripe background pattern
- Custom scrollbar styling
- Shake animation
- Join pulse animation
- Toast slide-in animations (left/right)
- Flight path dash animation
- 3D flip utilities (`transform-style-preserve-3d`, `backface-hidden`, `rotate-y-180`)
- Link tray loading shimmer

## Component Tree

```
ProfilePageClient
├── ProfileCard (fullView=true)
│   ├── ProfileAvatar
│   ├── VerifiedCardWrapper
│   ├── VerifiedBadge
│   ├── ReferRankBadgeMulti
│   ├── AuthExplainerModal
│   ├── SubmitOtp
│   └── ProfileEditor (on flip)
├── ProfileHeader
│   ├── ProfileSearchDropdown
│   └── AddUserForm
└── ZcashFeedback
```

## Key Files (parent project)

| File | Purpose |
|------|---------|
| `ui/profile/ProfilePageClient.jsx` | Client entry, manages page title/favicon |
| `ui/profile/ProfileCard.jsx` | Main card with compact/full views |
| `ui/profile/ProfileAvatar.jsx` | Avatar with gradient/fallback |
| `ui/profile/ProfileEditor.jsx` | Full editing form |
| `ui/profile/VerifiedBadge.jsx` | Interactive verified badge |
| `ui/profile/VerifiedCardWrapper.jsx` | Tier-based card styling |
| `ui/profile/AuthExplainerModal.jsx` | Auth status explainer modal |
| `ui/profile/ProfileHeader.jsx` | Top header with search |
| `ui/profile/ProfileSearchDropdown.jsx` | Search dropdown |
| `lib/profile/profile.js` | `fetchProfileForSlug()` |
| `lib/profile/profileUtils.js` | Trust, warnings, ranks, etc. |
| `lib/profile/normalizeSlugs.js` | Slug/URL utilities |
| `lib/profile/useProfileEvents.js` | Flip card state hook |
| `lib/profile/useProfileLinks.js` | Lazy link loading hook |
| `lib/messaging/useFeedback.js` | Shared state (address, edits, QR) |
| `lib/social/links.js` | Link icon/domain extraction |
| `lib/social/usernames.js` | Social username normalization |
| `lib/social/linkAuthFlow.js` | OAuth flow |
| `app/ZcashFeedback.js` | QR/feedback component |
