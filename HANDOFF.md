# Handoff: Directory API Updates

## Summary

Updated `/api/directory` endpoint to match wallet API documentation, implementing proper ranking and response format.

## Changes Made

### 1. API Response Format (`app/api/directory/route.ts`)

**Before:**
```json
{
  "results": [{ "id": 1, "name": "cobra", "verified_links_count": 2, ... }],
  "exists": false,
  "next_cursor": "..."
}
```

**After:**
```json
{
  "results": [{
    "username": "cobra",
    "display_name": "Cobra",
    "address": "u1...",
    "address_verified": true,
    "authenticated_links": [{ "id": 1, "label": "...", "url": "...", "is_verified": true }],
    "unauthenticated_links": [{ "id": 2, "label": "...", "url": "...", "is_verified": false }],
    ...
  }],
  "exists": true,
  "next_cursor": "..."
}
```

Key changes:
- `name` → `username`
- Removed `id`, `verified_links_count` from response
- Added `authenticated_links` and `unauthenticated_links` arrays (batch-fetched from `zcasher_links`)
- Kept `exists` for username availability checks

### 2. Search Ranking (`computeRankTier` function)

Implemented 5-tier ranking system:

| Tier | Match Type | Example for query "cobra" |
|------|------------|---------------------------|
| 0 | Exact username match | `cobra` |
| 1 | Username starts with query | `cobraking`, `cobra123` |
| 2 | Link handle starts with query | user with `cobrafan` handle |
| 3 | Username contains query | `kacobra`, `theCobra` |
| 4 | Link handle contains query | user with `mycobra` handle |

Results sorted by tier, then alphabetically within each tier.

### 3. Frontend Compatibility (`ui/profile/ProfileSearchDropdown.tsx`)

Added transformer to convert new API format to internal `Profile` type:

```typescript
function transformApiResult(r: ApiDirectoryResult): Profile {
  return {
    id: 0,
    name: r.username,  // Map username → name for internal use
    verified_links_count: r.authenticated_links.length,
    // ...
  };
}
```

Updated:
- Key prop from `p.id` to `p.name` (username is unique)
- Uses `exists` from API for username availability (not local check)

### 4. Documentation (`WALLET_API_README.md`)

Rewrote to match current implementation with:
- Updated response examples
- Documented ranking behavior
- Added link object field descriptions
- Updated changelog

## Files Modified

- `app/api/directory/route.ts` - API implementation
- `ui/profile/ProfileSearchDropdown.tsx` - Frontend search component
- `WALLET_API_README.md` - API documentation

## Testing Notes

- Single character searches now correctly show username availability (was broken when `exists` was removed)
- Exact username matches appear first in results
- Links are batch-fetched in single query for performance

## Commits

1. `88a4ca3` - Implement ranking and match wallet API docs for /api/directory
2. (pending) - Fix username availability check, add exact match ranking tier

## Open Items

- Consider adding exact link handle match as Tier 0.5 (between exact username and starts-with)
- `lib/swap/oneClick.ts` has uncommitted fee change (1000 → 150 basis points)
- `next-env.d.ts` has uncommitted changes
