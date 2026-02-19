# /lib/directory - Profile Discovery

## Purpose
Search and discovery logic for the zcash.me profile directory.
Powers the main search functionality and featured profiles.

## Key Files

### searchCitiesAction.ts
Geographic filtering (server action):
```typescript
async function searchCitiesAction(query: string): Promise<City[]>
```
Used for location-based profile discovery. Inlines city-timezones lookup.

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
