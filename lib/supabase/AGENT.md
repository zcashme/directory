# /lib/supabase - Database Client

## Purpose
Supabase client initialization and database connection management.
Single source of truth for all database access.

## Client Setup

### Server-Side Client
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!  // Server-only key
);
```

### Client-Side Client
```typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // Public key
);
```

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL     - Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY - Public anon key (client)
SUPABASE_SERVICE_KEY         - Service role key (server only)
```

## Database Tables

### zcasher (Profiles)
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| name | text | Username (normalized) |
| display_name | text | Shown in UI |
| slug | text | URL path |
| address | text | Zcash address |
| address_verified | boolean | Blockchain verified |
| bio | text | Short description |
| avatar_url | text | Profile image |
| is_ns | boolean | Network School member |
| featured | boolean | Homepage featured |

### zcasher_links (Profile Links)
| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| profile_id | uuid | FK to zcasher |
| provider | text | Platform name |
| value | text | Handle or URL |
| verified | boolean | Link verified |

### zcasher_searchable (Search Index)
Denormalized view for fast search queries.

## Query Patterns

```typescript
// Fetch profile by slug
const { data } = await supabase
  .from('zcasher')
  .select('*, zcasher_links(*)')
  .eq('slug', slug)
  .single();

// Search profiles
const { data } = await supabase
  .from('zcasher_searchable')
  .select('*')
  .ilike('name', `%${query}%`)
  .limit(25);
```

## Testing Harness
- Mock Supabase client in tests
- Use test database for integration
- Never use production keys in tests
