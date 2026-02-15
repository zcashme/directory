# /app - Next.js App Router

## Purpose
Contains all page routes and API endpoints for zcash.me. Uses Next.js 16 App Router with React 19.

## Key Routes

| Path | Description |
|------|-------------|
| `/` | Homepage with featured Zcash profiles |
| `/[slug]` | Dynamic profile pages (e.g., /alice) |
| `/ns` | Network School directory - filtered profile list |
| `/swap-app` | Cryptocurrency swap interface (Defuse OneClick) |
| `/leader-app` | Referral leaderboard dashboard |
| `/stats-app` | Network statistics |
| `/thread` | Discussion board (OTP-verified posting) |
| `/design-system` | Component showcase for manual testing |

## API Routes

### `/api/resolve/[username]` - GET
Profile lookup by username. Returns profile with links.

### `/api/directory` - GET
Search profiles with ranking. Supports `q`, `limit`, `cursor`, `verified_only` params.
Features space-insensitive, case-insensitive matching with relevance ranking.

### `/api/social` - GET
Social platform lookup (stub implementation).

## Zcash-Specific Patterns
- Profile pages display Zcash unified addresses (u1...) prominently
- QR codes encode `zcash:` URIs with memo for verification
- Swap routes handle ZEC as primary currency with cross-chain support

## Testing Harness
- No automated tests in /app
- Use `/design-system` route for manual component testing
- API routes use rate limiting via `/lib/api/guard.ts`

## Adding New Pages
1. Create folder under `/app/[route-name]`
2. Add `page.tsx` with default export
3. Use server components by default, `'use client'` only when needed
4. Import UI from `/ui/*`, logic from `/lib/*`

## Environment Variables
```
NEXT_PUBLIC_BASE_DOMAIN - zcash.me or localhost:3000
NEXT_PUBLIC_SUPABASE_URL - Database URL
ZVS_SECRET_SEED - HMAC secret for OTP generation
```
