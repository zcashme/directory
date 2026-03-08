# /app - Next.js App Router

## Purpose
All page routes and API endpoints. Pages compose components from `/ui` with logic
from `/lib`. Uses Next.js App Router with React Server Components by default.

## Shared Layout
`layout.tsx` wraps every page with `ProfileHeader` (sticky nav + search + Join button),
`FloatingSidebarMenu` (cross-app navigation), and a footer (X, Discord, GitHub, Terms, Privacy).

## Pages

| Internal Path | Subdomain URL | Description | Status |
|---------------|---------------|-------------|--------|
| `/` | zcash.me | Homepage with featured profiles carousel | [live] |
| `/[slug]` | zcash.me/:username | Profile page with card, payment composer, swap | [live] |
| `/ns` | zcash.me/ns | Network School directory (custom layout + favicon) | [live] |
| `/swap-app` | swap.zcash.me | Cross-chain swap form (1Click/Defuse SDK) | [live] |
| `/leader-app` | leaders.zcash.me | Referral leaderboard with podium, FAQ, period filters | [live] |
| `/leader-app/[username]` | leaders.zcash.me/:username | Individual referrer stats + referral table | [live] |
| `/blog-app` | blog.zcash.me | Blog post listing | [live] |
| `/blog-app/[slug]` | blog.zcash.me/:slug | Individual blog post | [live] |
| `/status-app` | status.zcash.me | Service health dashboard (polls /api/health + OpenStatus) | [live] |
| `/thread/[[...slug]]` | thread.zcash.me | Discussion board (optional board ID in slug) | [WIP] |
| `/design-system` | zcash.me/design-system | Component showcase for all ui/common components | [live] |
| `/terms` | zcash.me/terms | Terms of service | [live] |
| `/privacy` | zcash.me/privacy | Privacy policy | [live] |
| `/donate-app` | donate.zcash.me | (registered in proxy.ts, no page yet) | [stub] |

## API Routes

| Endpoint | Method | Description | Cache |
|----------|--------|-------------|-------|
| `/api/resolve?username=` | GET | Profile lookup by username (query param) | 60s |
| `/api/resolve/[username]` | GET | Profile lookup by username (URL param) | 60s |
| `/api/directory?q=&limit=&cursor=&verified_only=` | GET | Profile search with multi-tier ranking, pagination, CORS | 30s |
| `/api/social?platform=&handle=` | GET | Social handle -> Zcash address lookup (12 platforms) | 300s |
| `/api/health` | GET | Internal service health: directory, verifications, zcashme | 600s |
| `/api/openstatus` | GET | Proxies OpenStatus.dev for external monitoring | 60s |

All API routes use `enforceApiGuard()` for authentication and `withCacheHeaders()` for CDN caching.

## Subdomain Routing (`proxy.ts`)
- Subdomains rewrite to internal `/app` paths (e.g. `swap.zcash.me` -> `/swap-app`)
- Aliases redirect: `leader` -> `leaders`, `swaps` -> `swap` (308)
- `/:slug/refer` redirects to `/:slug?join=1&referred_by=...` (307)
- `/NS` or `/Ns` normalizes to `/ns` (308)
- Direct access to internal paths like `/swap-app` without subdomain returns 404
- Reserved roots (never treated as usernames): all sub-app paths, `/api`, `/ns`, `/design-system`, `/privacy`, `/terms`

## See Also
- Every page imports from `/ui` (components) and `/lib` (server logic)
- See `AGENT.md` in each `/lib` and `/ui` subfolder for feature-specific details
