# zcash.me - Agent Reference

## What is zcash.me?
A privacy-focused identity and payments platform built on Zcash.
One Next.js app serving multiple sub-apps via subdomain routing (`proxy.ts`).
Hosted on Vercel.

## Shared Layout
`app/layout.tsx` wraps every page with:
- **ProfileHeader** — top nav bar, shows total profile count
- **FloatingSidebarMenu** — sidebar navigation across sub-apps
- **Footer** — social links (X, Discord, GitHub), Terms, Privacy

## User-Facing Pages

### zcash.me — Homepage [live]
The directory. Featured profiles, search by name/city, and a "Join" button
to create a profile (username, Zcash address, links, bio, photo, city).

### zcash.me/:username — Profile Page [live]
A user's public profile. Display name, bio, avatar, verified links, Zcash
address, and a payment composer to send them ZEC. Supports cross-chain
swaps (send ETH/BTC/etc, recipient gets ZEC).

### swap.zcash.me — Swap App [live]
Standalone swap tool (OneClick/Defuse SDK). Swap any supported token into
ZEC to a deposit address. Can be pre-filled via `?depositAddress=`.

### leaders.zcash.me — Leaderboard [live]
Referral leaderboard. Rankings by verified referrals, commission earned
(in zats), period filters (daily/weekly/monthly/all-time). Detail page
at leaders.zcash.me/:username for individual referral breakdowns.

### blog.zcash.me — Blog [live]
Markdown-driven blog. Posts at blog.zcash.me/:slug.

### status.zcash.me — Status Page [live]
Service health dashboard. Polls internal `/api/health` + OpenStatus API.
Shows per-service latency and recent incidents.

### thread.zcash.me — Discussion Board [WIP]
Public message board. Page exists but is a stub (no data fetching yet).

### donate.zcash.me — Donate [stub, not built]
Registered in `proxy.ts` but has no page yet.

## How Subdomain Routing Works
`proxy.ts` rewrites subdomains to internal `/app` paths.
Aliases redirect automatically (`leader` → `leaders`, `swaps` → `swap`).
Direct access to internal paths like `/swap-app` without the subdomain returns 404.
`/:username/refer` links redirect to the profile page with the join modal open.

## Codebase Structure
```
/app   → Next.js pages and API routes (one folder per sub-app)
/lib   → Shared business logic, server actions, types
/ui    → Shared React components by feature
```

All sub-apps share `/lib` and `/ui`. See `AGENT.md` in each subfolder for details.

## Tech Stack
- Next.js 16 (App Router) + React 19 + TypeScript 5.9
- Supabase (PostgreSQL) · Vercel hosting
- Zustand + React Query · TailwindCSS 4 + Framer Motion
