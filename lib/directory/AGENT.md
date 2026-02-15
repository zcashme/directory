# /lib/directory - Profile Discovery

## Purpose
Search and discovery logic for the zcash.me profile directory.
Powers the main search functionality and featured profiles.

## Key Files

### searchProfiles.ts
Profile search with ranking:
```typescript
async function searchProfiles(query: string, options?: {
  limit?: number;       // Default: 25
  cursor?: string;      // Pagination
  verifiedOnly?: boolean;
}): Promise<{
  results: Profile[];
  nextCursor?: string;
  exists: boolean;
}>
```

**Ranking Logic:**
1. Username starts with query (highest)
2. Username contains query
3. Display name matches
4. Link text contains query

### searchCities.ts
Geographic filtering:
```typescript
async function searchCities(query: string): Promise<City[]>
```
Used for location-based profile discovery.

### fetchFeaturedProfiles.server.ts
Homepage featured profiles:
```typescript
async function fetchFeaturedProfiles(): Promise<Profile[]>
```
Returns profiles marked as `featured: true` in database.

### getNsProfilesAction.ts
Network School directory:
```typescript
async function getNsProfilesAction(): Promise<Profile[]>
```
Filters by `is_ns`, `is_ns_core`, `is_ns_longterm` flags.

### types.ts
```typescript
interface City {
  id: string;
  name: string;
  country: string;
  iso2: string;
}
```

## Search Features
- **Case-insensitive** - "Alice" = "alice"
- **Space-insensitive** - "alice z" matches "alicez"
- **Fuzzy matching** - Searches username, display name, links
- **Cursor pagination** - For infinite scroll

## Database
Queries `zcasher_searchable` - denormalized table optimized for search:
- Pre-computed `link_search_text`
- Indexed for fast queries

## Testing Harness
- Mock Supabase responses
- Test ranking logic with various queries
- Verify pagination cursor handling
- Test empty/no-result states

## API Integration
Exposed via `/api/directory` endpoint.
Rate-limited via `/lib/api/guard.ts`.
