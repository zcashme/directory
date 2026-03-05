# /lib - Server-Side Business Logic

## Purpose
All server actions, data fetching, types, and utilities. Pages in `/app` call into
`/lib` for business logic. Components in `/ui` consume types and call server actions
defined here.

## Directory Overview

| Folder | Purpose | See |
|--------|---------|-----|
| `profile/` | Profile types, fetching, username validation, link enrichment, avatar storage, trust/warning state | `lib/profile/AGENT.md` |
| `directory/` | Homepage carousel, directory search, city search, NS directory | `lib/directory/AGENT.md` |
| `signup/` | Profile creation server actions, real-time username/address validation | `lib/signup/AGENT.md` |
| `verification/` | ZVS address verification (HMAC OTP), profile edit persistence, reward snapshots | `lib/verification/AGENT.md` |
| `swap/` | 1Click/Defuse SDK integration for cross-chain swaps | `lib/swap/AGENT.md` |
| `leaderboard/` | Referral commission calculations, leaderboard rankings, referrer stats | `lib/leaderboard/AGENT.md` |
| `thread/` | Discussion board server actions [WIP — all stubbed] | `lib/thread/AGENT.md` |
| `supabase/` | Database client initialization (server + client) | `lib/supabase/AGENT.md` |
| `api/` | API guard (key validation + caching), standardized response types | `lib/api/AGENT.md` |

## Key Server Actions

| Action | File | What It Does |
|--------|------|-------------|
| `createProfileAction` | `signup/createProfileAction.ts` | Creates new profile with links |
| `confirmOtpAction` | `verification/confirmOtpAction.ts` | Verifies OTP, applies profile edits, records reward snapshot |
| `generateMemoAction` | `verification/generateMemoAction.ts` | Generates memo + zcash: URI for verification |
| `getLeaderboardAction` | `leaderboard/getLeaderboardAction.ts` | Ranked leaderboard with earnings and period filters |
| `getReferrerStatsAction` | `leaderboard/getReferrerStatsAction.ts` | Per-referrer detail page data |
| `getSwapTokens` / `getSwapQuote` / `confirmSwap` | `swap/oneClick.ts` | Token discovery, quotes, deposit addresses |
| `getProfileLinksBatchAction` | `profile/getProfileLinksBatchAction.ts` | Batch-fetch links by profile IDs |

## Database Access
All queries go through Supabase clients in `lib/supabase/`. Main tables: `zcasher`,
`zcasher_links`, `zcasher_searchable`, `zcasher_verifications`, `referrer_ranked_*`.
