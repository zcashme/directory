# Task: Rewrite Social Lookup API

## Overview
Restore and enhance the public-facing Social Lookup API that resolves social media handles to Zcash addresses. This API enables external services (wallets, payment processors, third-party apps) to lookup verified Zcash addresses from social media profiles.

## Business Value
- **Payment Integration**: External apps can resolve social handles (e.g., "@username") to Zcash addresses
- **UX Enhancement**: Users can send crypto using memorable social handles instead of complex addresses
- **Network Effects**: Public API increases directory adoption and utility
- **Trust Layer**: Returns verification status to help users make informed decisions

## Previous Implementation
The API was originally added in commit `01dc8d1` (Jan 15, 2026) and removed in commit `4dd50fd` (Feb 6, 2026) during the Server Actions refactoring.

### Original Endpoint
```
GET /api/social/[platform]/[handle]
```

### Previous Response Format
```json
{
  "link": {
    "platform": "x",
    "handle": "elonmusk",
    "url": "https://x.com/elonmusk",
    "is_verified": true
  },
  "address": "zs1...",
  "profile_name": "Elon Musk",
  "address_verified": true
}
```

### Error Responses
- `400`: `unsupported_platform` or `invalid_handle`
- `404`: `not_found`, `not_verified`, or `address_missing`
- `500`: `lookup_failed` or `profile_lookup_failed`

## Technical Requirements

### 1. Restore Route Handler
**File**: `app/api/social/[platform]/[handle]/route.js`

**Responsibilities**:
- Accept GET requests with platform and handle params
- Validate input parameters
- Call underlying lookup function
- Return JSON response with appropriate status codes
- Implement HTTP caching headers

### 2. Lookup Logic
**File**: `lib/profile/social-lookup.js` (already exists, may need updates)

**Supported Platforms**:
- X (Twitter)
- GitHub
- Instagram
- Reddit
- LinkedIn
- Discord
- TikTok
- Bluesky
- Mastodon
- Snapchat
- Telegram

**Lookup Algorithm**:
1. Normalize platform identifier (handle aliases like twitter→x)
2. Normalize and validate handle
3. Build URL patterns based on platform hosts
4. Query `zcasher_links` table by:
   - Label match (case-insensitive)
   - URL pattern match (multiple host variations)
5. Filter for verified links only
6. Fetch associated profiles from `zcasher` table
7. Rank candidates by:
   - Link verification status (priority: 2)
   - Address verification status (priority: 1)
   - Profile ID (tiebreaker)
8. Return best match

### 3. Caching Strategy
- **HTTP Cache-Control**: `s-maxage=300` (5 minutes edge cache)
- **Rationale**: Balance between freshness and performance
- **Future**: Consider longer cache for verified addresses, shorter for lookups that fail

### 4. Rate Limiting (New Requirement)
Since this is a public API, implement rate limiting:
- **Option A**: Vercel Edge Config + KV for rate limiting
- **Option B**: HTTP headers documenting limits (implement enforcement later)
- **Suggested Limits**: 100 requests/minute per IP, 1000/hour

## Implementation Steps

### Step 1: Restore Route Handler
```bash
git restore 4dd50fd~1 -- app/api/social/[platform]/[handle]/route.js
```
Then update imports to point to current file locations:
```javascript
import { lookupSocialAddress } from "@/lib/profile/social-lookup";
```

### Step 2: Verify social-lookup.js
Current location: `lib/profile/social-lookup.js`

**Review checklist**:
- [ ] All platform configs are up-to-date
- [ ] URL pattern matching works for all platforms
- [ ] Ranking algorithm is correct
- [ ] Error handling is comprehensive
- [ ] Uses current Supabase client

### Step 3: Add API Documentation
**File**: `app/api/social/README.md`

Document:
- Endpoint URL structure
- Supported platforms
- Request/response formats
- Error codes and meanings
- Rate limits
- Example requests with curl
- Code examples (JavaScript, Python)

### Step 4: Add Tests (Recommended)
Create test file to verify:
- Platform normalization (twitter→x)
- Handle normalization (various input formats)
- URL pattern matching
- Ranking algorithm with multiple candidates
- Error cases (invalid platform, missing profile, etc.)

### Step 5: Security Review
- [ ] No SQL injection vectors (Supabase handles this)
- [ ] Input validation prevents abuse
- [ ] No sensitive data leaked in errors
- [ ] Rate limiting considerations
- [ ] CORS headers if needed for browser requests

### Step 6: Add Monitoring
Consider logging:
- Request volume per platform
- Success vs error rates
- Cache hit rates
- Popular handles being looked up
- Failed lookups (to identify missing profiles)

## Edge Cases to Handle

### Platform-Specific
- **X/Twitter**: Handle both numeric IDs and usernames
- **Discord**: Multiple domain variations
- **Telegram**: t.me vs telegram.me

### Data Quality
- Multiple profiles claiming same handle (return highest ranked)
- Unverified links (exclude from results)
- Profile without address (return 404)
- Deleted/renamed social accounts (return 404)

### Input Validation
- URL-encoded handles
- Handles with special characters
- Case sensitivity
- Leading @ symbols
- Trailing slashes in platform names

## API Usage Examples

### External Wallet Integration
```javascript
// Wallet app resolves social handle before payment
async function resolvePaymentAddress(socialHandle) {
  const response = await fetch(
    `https://yourapp.com/api/social/x/${socialHandle}`
  );
  const data = await response.json();
  
  if (response.ok) {
    return {
      address: data.address,
      name: data.profile_name,
      verified: data.address_verified
    };
  }
  
  throw new Error(`Could not resolve @${socialHandle}`);
}
```

### Payment Form Enhancement
```javascript
// Allow users to type @username instead of full address
<input 
  placeholder="@username or zs1..." 
  onBlur={async (e) => {
    if (e.target.value.startsWith('@')) {
      const handle = e.target.value.slice(1);
      const result = await fetch(`/api/social/x/${handle}`);
      if (result.ok) {
        const data = await result.json();
        setAddress(data.address);
      }
    }
  }}
/>
```

## Deployment Checklist
- [ ] Route handler file created/restored
- [ ] Imports updated to current file paths
- [ ] Local testing completed
- [ ] Documentation written
- [ ] Error handling verified
- [ ] Caching headers confirmed
- [ ] Deploy to staging
- [ ] Test from external client
- [ ] Monitor error rates
- [ ] Deploy to production
- [ ] Announce API availability

## Future Enhancements

### Phase 2
- [ ] Add POST endpoint for bulk lookups
- [ ] Return multiple matches with ranking scores
- [ ] Add reverse lookup (address → social profiles)
- [ ] Webhook notifications for profile updates

### Phase 3
- [ ] OpenAPI/Swagger documentation
- [ ] SDK libraries (JavaScript, Python)
- [ ] API key authentication (for higher rate limits)
- [ ] Analytics dashboard for API usage

### Phase 4
- [ ] GraphQL endpoint option
- [ ] Batch resolution for multiple handles
- [ ] Profile metadata enrichment
- [ ] Historical handle changes tracking

## Success Metrics
- API availability (target: 99.9%)
- Average response time (target: <200ms)
- Cache hit rate (target: >80%)
- External integrations using the API (track via User-Agent)
- Error rate (target: <1%)

## Questions to Answer Before Implementation
1. Do we want CORS enabled for browser requests?
2. What rate limiting strategy should we use?
3. Should we require API keys or keep it fully open?
4. Do we need usage analytics/logging?
5. Should we document this in the main README?

## Related Files
- `/Users/jules/Sites/directory/lib/profile/social-lookup.js` (core logic)
- `/Users/jules/Sites/directory/lib/profile/usernameNormalizer.js` (handle normalization)
- `/Users/jules/Sites/directory/supabase_schema.md` (database schema reference)

## Original Commit References
- Added: `01dc8d1` - feat(api): add platform social lookup
- Removed: `4dd50fd` - Remove unused Route Handlers
- Last routes commit: `3a4604e` - refactor: standardize server actions

---

**Priority**: Medium-High  
**Effort**: Small (2-4 hours)  
**Dependencies**: None (all underlying code exists)  
**Risk**: Low (restoring existing functionality)
