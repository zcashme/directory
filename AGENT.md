# zcash.me - Agent Reference

## Project Overview
A privacy-focused identity and payments platform built on Zcash.
Users create profiles linked to their Zcash addresses and prove ownership
via blockchain transactions.

## Tech Stack
- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript 5.9
- **Database**: Supabase (PostgreSQL)
- **State**: Zustand (colocated in `/ui/*/store.ts`) + React Query (server)
- **Styling**: TailwindCSS 4
- **Animations**: Framer Motion

## Directory Structure
```
/app        → Next.js pages and API routes
/lib        → Core business logic and utilities
/ui         → React components by feature
/public     → Static assets
```

## Zcash Integration Points

### Address Types (prefer unified)
| Prefix | Type | Privacy | Use |
|--------|------|---------|-----|
| `u1` | Unified | High | Recommended |
| `zs1` | Sapling | High | Acceptable |
| `t1`/`t3` | Transparent | None | Warn user |

### Verification Flow (ZVS)
1. User generates QR → creates session with memo `zvs/{session_id},{u-address}`
2. User sends 0.003 ZEC to ZVS address with memo
3. OTP computed deterministically from memo (HMAC-SHA256)
4. User enters OTP → pending edits applied, profile verified

### Key Utilities
- `/lib/zcash/zcashUtils.ts` - Address validation, URI building
- `/lib/verification/` - OTP confirmation logic
- `/lib/swap/` - OneClick SDK for cross-chain swaps

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL      - Database URL
NEXT_PUBLIC_SUPABASE_ANON_KEY - Public DB key
ZVS_SECRET_SEED               - HMAC secret for OTP generation
NEXT_PUBLIC_BASE_DOMAIN       - zcash.me or localhost
ONECLICK_API_KEY              - Defuse swap API
API_KEY                       - Server-side API auth
```

## Quick Start for Agents
1. Read `/lib/AGENT.md` for business logic overview
2. Read `/ui/AGENT.md` for component patterns
3. Check feature-specific AGENT.md in subfolders
4. Use `/app/design-system` to see components

## Common Tasks

### Add New Profile Field
1. Update types in `/lib/profile/types.ts`
2. Add validation in `/lib/validation/`
3. Update UI in `/ui/profile/` or `/ui/signup/`
4. Update server action if needed

### Add New API Endpoint
1. Create route in `/app/api/[route]/route.ts`
2. Use `apiGuard` from `/lib/api/guard.ts`
3. Return consistent `ApiResponse` format

### Add New UI Component
1. Create in appropriate `/ui/` subfolder
2. Export from folder's `index.ts`
3. Use `/ui/common/` building blocks
4. Add to design-system page if reusable

### Repo Overview

What Is This?

  Zcash.me — an open-source public directory for Zcash addresses. Users claim a vanity URL (zcash.me/yourname), register their Zcash address, and get a
  shareable profile page with a QR code so people can send them ZEC without copying long addresses.

  ---
  Tech Stack

  ┌─────────────┬─────────────────────────────────────────────────┐
  │    Layer    │                   Technology                    │
  ├─────────────┼─────────────────────────────────────────────────┤
  │ Framework   │ Next.js 16 (App Router, React 19)               │
  ├─────────────┼─────────────────────────────────────────────────┤
  │ Language    │ TypeScript (strict mode)                        │
  ├─────────────┼─────────────────────────────────────────────────┤
  │ Database    │ Supabase (PostgreSQL + RLS)                     │
  ├─────────────┼─────────────────────────────────────────────────┤
  │ Styling     │ Tailwind CSS v4                                 │
  ├─────────────┼─────────────────────────────────────────────────┤
  │ Animations  │ Framer Motion                                   │
  ├─────────────┼─────────────────────────────────────────────────┤
  │ State       │ Zustand (client), TanStack React Query (server) │
  ├─────────────┼─────────────────────────────────────────────────┤
  │ Crypto swap │ Defuse Protocol one-click SDK                   │
  ├─────────────┼─────────────────────────────────────────────────┤
  │ QR codes    │ qrcode.react                                    │
  └─────────────┴─────────────────────────────────────────────────┘

  ---
  Directory Structure (by concern)

  app/ — Pages & Routes

  ┌─────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────┐
  │          Path           │                                       What it does                                       │
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ page.tsx / HomePage.tsx │ Landing page — featured profiles carousel, typing effect, "Claim your name" CTA          │
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ [slug]/ProfilePage.tsx  │ Dynamic profile page — donate mode (QR + address), swap mode (Defuse), verify mode (OTP) │
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ ns/DirectoryNS.tsx      │ Network School member directory — filterable table with search, location, role filters   │
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ swap-app/               │ Standalone crypto swap interface (token selection, quotes, slippage)                     │
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ leader-app/             │ Referral rewards leaderboard — commission tiers, earnings tracking                       │
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ thread/                 │ Community messaging (WIP, mostly TODOs)                                                  │
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ api/directory/          │ GET /api/directory?q=&limit=&cursor= — search profiles (30s cache)                       │
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ api/resolve/            │ GET /api/resolve?username= — resolve one profile (60s cache)                             │
  ├─────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ api/social/             │ GET /api/social?platform=&handle= — find address by social handle (300s cache)           │
  └─────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────┘

  lib/ — Business Logic

  Module: profile/
  Responsibility: Types (Profile, ProfileLink, ProfileTrust), Supabase queries, link enrichment (domain→icon mapping for 30+ platforms), trust
    calculation, username policy (NFKC normalization, slug rules)
  ────────────────────────────────────────
  Module: signup/
  Responsibility: Profile creation — createProfileAction inserts into zcasher + zcasher_links
  ────────────────────────────────────────
  Module: verification/
  Responsibility: Address verification via OTP — HMAC-SHA256 generation matching the Rust ZVS backend. Memo format: zvs/TIMESTAMP,SESSIONID
  ────────────────────────────────────────
  Module: zcash/
  Responsibility: Address validation (Sapling zs1, Unified u1, transparent t1/t2/t3), URI building (zcash:ADDR?amount=X&memo=Y), memo Base64URL encoding
  ────────────────────────────────────────
  Module: swap/
  Responsibility: Defuse Protocol integration — quote generation, deposit addresses, slippage, token decimals
  ────────────────────────────────────────
  Module: leaderboard/
  Responsibility: Referral rewards — base 5% commission, +0.5% per verified link (up to 15%), 12-month reward window
  ────────────────────────────────────────
  Module: supabase/
  Responsibility: Client-side and server-side Supabase instances (server uses service key to bypass RLS)
  ────────────────────────────────────────
  Module: api/guard.ts
  Responsibility: API key enforcement (X-API-Key header required on all API routes)

  ui/ — React Components

  ┌───────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │    Folder     │                                                            Components                                                             │
  ├───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ profile/      │ ProfileCard, ProfileAvatar, ProfileEditor (edit modal), VerifiedBadge, ProfileSearchDropdown, ProfileCardWarning (trust warnings) │
  ├───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ signup/       │ AddUserForm (multi-step wizard), ZcashAddressInput, SocialLinkInput, CitySearchDropdown                                           │
  ├───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ verification/ │ VerifyProfileModal, OtpInput, QrUriBlock, AmountAndWallet                                                                         │
  ├───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ swap/         │ SwapComposer, SwapCurrencyPair, SwapQuoteDisplay, SwapSlippageControl                                                             │
  ├───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ common/       │ Shared form inputs, buttons, dropdowns                                                                                            │
  ├───────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ links/        │ Social link connection/verification flows, provider configs                                                                       │
  └───────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  ---
  Data Model (Supabase)

  zcasher — the main profiles table:
  - id, name (username), display_name, bio, address (Zcash address)
  - address_verified (boolean — proved via on-chain OTP)
  - nearest_city_name, country, iso2
  - is_ns, is_ns_core, is_ns_longterm (Network School flags)
  - referred_by_zcasher_id (referral tracking)

  zcasher_links — social/web links per profile:
  - zcasher_id (FK), url, label, platform
  - is_verified, pending_verif, verification_expires_at

  zcasher_searchable — denormalized view with link_search_text for full-text search

  ---
  Key Flows

  Signup

  1. User enters username → real-time availability check
  2. Enters Zcash address → validated (Sapling/Unified preferred, transparent warned)
  3. Adds social links → normalized per platform
  4. Submits → profile created in zcasher + links in zcasher_links

  Address Verification (ZVS)

  1. User clicks "Verify" → generateMemoAction creates a ZVS memo
  2. User sends a tiny ZEC transaction with that memo to a shielded address
  3. ZVS backend (Rust, separate Azure VM) processes it and returns an OTP
  4. User enters OTP → confirmOtpAction validates HMAC → address_verified = true

  Directory Search

  Tiered ranking: username prefix match > username contains > display name prefix > display name contains > link text contains. Secondary sort by
  verified status then alphabetical.

  Referral Rewards

  Referrers earn commission (5%–15% depending on verified link count) on referred users' activity for 12 months, with eligibility requiring verification
  within 4 weeks.

  ---
  Architecture Highlights

  - Privacy-first: no analytics, no cookies, no tracking
  - API-key gated routes for wallet integrations (search, resolve, social lookup)
  - Server actions for mutations (Next.js "use server")
  - React Query for caching/fetching on the client
  - Component hierarchy: RootLayout → ProfileHeader + page content → feature-specific component trees with modals via createPortal + Framer Motion
  animations
  - Service Worker kill switch in public/sw.js — nukes old PWA caches on activation

  ---
  WIP / Incomplete

  - Thread/messaging (app/thread/, lib/thread/) — skeleton in place but server actions are TODOs
  - Link verification — framework exists in ui/links/ but provider flows are partially implemented
