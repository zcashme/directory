# /lib/leaderboard - Referral Commission System

## Purpose
Server-side logic for the referral leaderboard and commission calculations.
Powers the leaderboard page (leaders.zcash.me) and individual referrer detail
pages (leaders.zcash.me/:username).

## What the User Experiences

### Leaderboard Page
A ranked table of top referrers showing: rank, avatar, name, referral counts
(verified vs total), conversion rate, commission tier, active rewards count,
monthly payout, and total earned. Filterable by period (daily/weekly/monthly/all-time).

### Referrer Detail Page
A per-referrer breakdown at leaders.zcash.me/:username showing: referrer profile
with ranks (all-time/weekly/monthly), and a table of each referred user with:
join date, eligibility deadline, verification date, activation status, link counts,
commission earned, and whether rewards are still active.

## Commission Model

- **Base rate**: 15%
- **Profile completeness**: +5% each for profile picture, bio, and location (max +15%)
- **Per authenticated link**: +10% per verified link
- **Cap**: 50% maximum commission rate
- **Fee**: 0.001 ZEC per verification event
- **Monthly reward** per active referral: 0.001 ZEC x locked rate (e.g. 0.0005 ZEC at 50%)
- **Rate lock-in**: Commission rate is locked at the moment the referred user verifies
  (not recalculated later). Stored in `zcasher_verifications`.
- **Duration**: 12 months from the referred user's first verification date

### Commission Tiers (by verified link count)
- Base: 0 links
- Bronze: 1+ links
- Silver: 3+ links
- Gold: 6+ links
- Platinum: 10+ links

### Referral Eligibility
- Referred user must verify their address within 4 weeks of signup to be "eligible"
- If eligible and verified, rewards are "active" for 12 months from first verification
- After 12 months: "expired"
- If not verified within 4 weeks: "ineligible"

## Database

| Table | Access |
|-------|--------|
| `zcasher` | Read — referrer + referred user profiles |
| `zcasher_links` | Read — verified link counts for commission calculation |
| `zcasher_verifications` | Read — verification events with locked commission rates and reward amounts |
| `referrer_ranked_alltime` | Read — pre-computed all-time rankings (materialized view) |
| `referrer_ranked_weekly` | Read — pre-computed weekly rankings |
| `referrer_ranked_monthly` | Read — pre-computed monthly rankings |

## File -> Feature Map

| File | Feature |
|------|---------|
| `rewardProgram.ts` | Constants (rates, windows, caps), `calculateCommissionRate()`, `computeReferralStatus()`, `getCommissionTier()`, date helpers |
| `getLeaderboardAction.ts` | Server action: ranked leaderboard with earnings, period filters (daily/weekly/monthly/alltime), commission calculations |
| `getReferrerStatsAction.ts` | Server action: per-referrer detail page data — referral table with status/earnings, summary stats, ranks |

## See Also
- `lib/verification/AGENT.md` — `confirmOtpAction` records the reward snapshot at verification time
