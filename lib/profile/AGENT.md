# /lib/profile - Profile Management

## Purpose
Core profile logic: types, fetching, username validation, link handling, verification.
Central to the zcash.me identity system.

## Key Files

### types.ts
```typescript
interface Profile {
  id: string;
  name: string;           // username (normalized)
  display_name: string;   // shown in UI
  slug: string;           // URL path
  bio?: string;
  address: string;        // Zcash address
  address_verified: boolean;
  avatar_url?: string;
  verified_links_count: number;
  is_ns?: boolean;        // Network School member
}

interface ProfileLink {
  id?: number | null;
  url: string;                        // full URL
  label?: string;                     // optional display label
  platform?: string | null;           // "X", "GitHub", "Discord", etc.
  is_verified: boolean;               // verified via OAuth
  verification_expires_at?: string;
  zcasher_id?: number;                // FK to zcasher(id)
}
```

### profileFetcher.ts
Database queries for profile retrieval. Uses Supabase client.

### usernamePolicy.ts
Username validation rules:
- Min/max length (3-30 chars)
- Allowed characters (alphanumeric, underscore)
- Reserved words blocked
- Profanity filter

### usernameNormalizer.ts
Unicode normalization and sanitization:
- Lowercase conversion
- Diacritic removal
- Homoglyph normalization (prevent impersonation)

### profileLinks.ts
Link enrichment utilities:
- Icon resolution by provider
- Label formatting
- URL construction

### social-lookup.ts
Social platform detection from URLs/handles.
Maps input to canonical provider names.

## Zcash Integration
- `address` field stores Zcash unified/sapling address
- `address_verified` confirms on-chain proof of ownership
- Links can be verified via blockchain transaction

## Testing Harness
- `usernamePolicy` and `usernameNormalizer` are pure functions
- Mock Supabase client for `profileFetcher` tests
- Example:
```typescript
expect(normalizeUsername('Álice')).toBe('alice');
expect(isValidUsername('__admin__')).toBe(false);
```

## Database Tables
- `zcasher` - Main profile records
- `zcasher_links` - Associated links
