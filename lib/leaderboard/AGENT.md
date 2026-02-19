# /lib/leaderboard - Referral System

## Purpose
Referral commission tracking and leaderboard calculations.
Rewards users for bringing new profiles to zcash.me.

## Key File

### getLeaderboardAction.ts
Server action for leaderboard data:
```typescript
'use server'
export async function getLeaderboardAction(): Promise<{
  leaders: LeaderEntry[];
  userRank?: number;
  userStats?: UserStats;
}>
```

## Data Model

### LeaderEntry
```typescript
interface LeaderEntry {
  profileId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  referralCount: number;
  totalCommission: number;  // In ZEC
  rank: number;
}
```

### Commission Tiers
Multi-tier referral system:
- **Direct referrals**: Higher commission
- **Second-tier**: Smaller percentage
- **Eligibility window**: Time-limited earning period

## Calculation Logic

```
User A refers User B
  ↓
User B creates profile
  ↓
User B receives payments
  ↓
User A earns X% commission on payments
  ↓
Tracked in leaderboard
```

## Database Fields
Profiles have referral tracking fields:
- `referred_by` - Profile ID of referrer
- `referral_code` - Unique code for sharing
- `commission_earned` - Total ZEC earned

## Zcash Integration
- Commissions paid in ZEC
- Tracked via transaction memos
- Settlement to referrer's Zcash address

## Testing Harness
- Mock referral chains
- Test commission calculations
- Verify ranking logic
- Test edge cases (self-referral, expired windows)

## UI Integration
Displayed in `/app/leader-app` using data from this action.

## Network School
NS members may have special referral bonuses tracked via
`is_ns_core` and `is_ns_longterm` flags.
