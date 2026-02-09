# Profile Routing Redesign

## Current Problem
The existing routing logic in `lib/profile/profileFetcher.ts:46` defaults to the discriminator (numeric ID) instead of the username when parsing patterns like `username-123`. This means if someone visits `/alice-42`, it will show user ID 42 regardless of their actual username.

## New Routing Logic

### Order of Operations

1. **Normalize slug**
   - Decode URI component
   - Trim and lowercase
   - Example: `Alice%20Smith` → `alice smith`

2. **Exact slug match** (lines 74-82)
   - Try to find profile where `slug` column matches exactly
   - Handles:
     - Custom slugs
     - Multi-dash patterns (e.g., `my-awesome-profile-name-123`)
     - Literal usernames that happen to look like discriminators

3. **Single-dash discriminator parsing** (lines 55-71)
   - **Only if**: Pattern matches `/^[a-z0-9_]+-\d+$/` (single dash with number)
   - **Multi-dash patterns are excluded** (e.g., `my-profile-name-123` skips this step)
   - Extract username and numeric ID
   - Try to find profile by numeric ID
   - If found: return it (works for both verified and unverified users)
   - If not found: fall back to name search for **username part only** (strip discriminator)

4. **Name-based search** (lines 85-86)
   - Search for the username (or full slug if no discriminator was parsed)
   - Uses `findProfileByName()` which:
     - Searches with both underscores AND spaces
     - Normalizes names (NFKC, trim, lowercase, remove special chars)
     - Returns up to 20 candidates
     - **Priority**: Verified profiles first (verified users don't need discriminators)
     - **Fallback**: Oldest profile (lowest ID)

5. **Enrich with ranks**
   - Fetch rank data from three tables
   - Merge into profile object

## Key Behaviors

### Discriminator Validation
- When visiting `/alice-42`:
  - If user ID 42 exists: show that profile (regardless of username)
  - If user ID 42 doesn't exist: search for username `alice`

### Verified Users
- Verified users don't need discriminators but both work:
  - `/alice` → finds verified Alice
  - `/alice-42` → if Alice's ID is 42, shows Alice; otherwise searches for `alice`
- Verified users get priority in name-based searches

### Multi-Dash Patterns
- Patterns like `/my-awesome-profile-name-123` are NOT parsed as discriminators
- They're treated as literal slugs and searched exactly

### Slug Field
- Auto-generated from username (normalized)
- Not user-customizable vanity URLs

## Examples

| URL | Behavior |
|-----|----------|
| `/alice` | Exact slug match → Name search (verified first) |
| `/alice-42` | Exact slug → Try ID 42 → Name search for 'alice' |
| `/my-profile-123-456` | Exact slug only (multi-dash, no discriminator parsing) |
| `/zooko` | Exact slug → Name search (verified Zooko) |
| `/zooko-132` | Exact slug → Try ID 132 → Name search for 'zooko' |

## Implementation Changes Required

1. Reorder routing: exact slug match FIRST, before discriminator parsing
2. Add multi-dash detection: only parse single-dash patterns as discriminators
3. Update fallback: when discriminator ID doesn't exist, search for username only (not full slug)
4. Maintain verified user priority in name searches
