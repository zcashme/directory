# AGENT.md Rewrite — Handoff Document

**Branch:** `dev/jules-agents-rewrite`
**Base:** `main`
**Date:** 2026-03-05
**Status:** Complete — all 21 files rewritten

---

## What This Work Is

The zcash.me codebase has 21 `AGENT.md` files spread across `/app`, `/lib`, and `/ui` directories. These files serve as onboarding documentation for AI agents (and humans) working in the codebase. They were originally generated but contained significant inaccuracies, missing context, and a code-first rather than user-first orientation.

This PR rewrites every `AGENT.md` file to be accurate, user-story-driven, and useful for someone who has never seen the codebase before.

---

## Files Changed

All 21 AGENT.md files:

### Root & App
- `AGENT.md` — multi-app architecture, subdomain routing, tech stack
- `app/AGENT.md` — all pages, API routes, proxy.ts routing rules

### lib/ (Server Logic)
- `lib/AGENT.md` — overview of all lib folders + key server actions
- `lib/profile/AGENT.md` — types, fetching, validation, avatar storage, trust/warnings
- `lib/directory/AGENT.md` — homepage carousel, search, city search, NS directory
- `lib/signup/AGENT.md` — profile creation flow, real-time validation
- `lib/verification/AGENT.md` — stateless HMAC OTP, edit persistence, reward snapshots
- `lib/swap/AGENT.md` — 1Click/Defuse SDK, quote/confirm/status flow
- `lib/leaderboard/AGENT.md` — commission model, leaderboard rankings, referrer stats
- `lib/thread/AGENT.md` — discussion board [WIP, all stubbed]
- `lib/api/AGENT.md` — API guard, response types
- `lib/supabase/AGENT.md` — database clients, key tables, avatar storage

### ui/ (React Components)
- `ui/AGENT.md` — overview of all UI folders
- `ui/profile/AGENT.md` — profile card, editor, avatar, badges, Maxi upgrade [WIP]
- `ui/signup/AGENT.md` — 6-step signup modal
- `ui/verification/AGENT.md` — QR display, OTP input, attempt tracking
- `ui/links/AGENT.md` — OAuth social link authentication
- `ui/swap/AGENT.md` — swap composer, auto-flow, deposit display
- `ui/thread/AGENT.md` — discussion board UI [WIP, backend stubbed]
- `ui/common/AGENT.md` — design system components
- `ui/messaging/AGENT.md` — memo composer, emoji autocomplete

---

## Key Issues Fixed

### Fabricated Content Removed
- Fake `social-lookup.ts` reference (lib/profile)
- Fake `types.ts` reference (lib/directory)
- Fake `AvatarPreviewModal` (ui/profile)
- Fake "Use Avatar" button feature (ui/links)
- Fake "in-memory store" and `status: "exhausted"` flow (ui/verification)
- Fake "Testing Harness" sections across 10+ files (no tests exist)
- Fake commission model ("User A earns X% commission on payments") replaced with accurate per-verification model
- Wrong import path (`@anthropic/defuse-one-click-sdk`) in lib/swap

### Missing Content Added
- 12+ files not documented in their AGENT.md (profileQueries.ts, profileUtils.ts, urlValidation.ts, avatarStorage.ts, etc.)
- Subdomain routing via proxy.ts (was completely absent)
- Status tags ([live], [WIP], [stub]) on every feature
- 6 missing API routes (resolve query, health, openstatus) and 4 missing pages (blog, status, terms, privacy)
- Reward snapshot logic in confirmOtpAction
- Commission model with correct rates, caps, and lock-in behavior
- Cross-references between lib/ and ui/ counterparts

### Inaccuracies Corrected
- Profile.id type: string -> number
- Signup form: 4 steps -> 6 steps
- Username policy: claimed profanity filter (not implemented)
- Verification: claimed server-side attempt tracking (actually client-side only)
- Leaderboard: claimed "second-tier" referrals (only direct referrals exist)

---

## The Pattern

Every AGENT.md follows a consistent structure:
1. **Title** — `# /path - Short Description`
2. **Purpose** — one or two sentences
3. **User stories** — what the user sees and does (outside-in)
4. **Database** — tables read/written (where relevant)
5. **File -> Feature Map** — every file mapped to its user-facing feature
6. **See Also** — cross-references to related AGENT.md files

Principles: user story first, no fabrication, no duplication of source code, include status tags, keep it readable in under 60 seconds.
