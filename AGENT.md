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
- `/ui/signup/zcashAddress.ts` - Address validation (URI building inlined in consumers)
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
2. Add validation in `/lib/profile/urlValidation.ts` or colocate with feature
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
