# /lib/signup - Profile Creation

## Purpose
Server actions for creating new Zcash profiles.
Handles validation, database insertion, and initial setup.

## Key Files

### createProfileAction.ts
Main server action for profile creation:
```typescript
'use server'
export async function createProfileAction(input: {
  username: string;
  displayName: string;
  bio?: string;
  address: string;
  links?: LinkInput[];
  cityId?: string;
}): Promise<{
  success: boolean;
  profileId?: string;
  slug?: string;
  error?: string;
}>
```

### createProfile.ts
Core creation logic (called by action):
```typescript
async function createProfile(data: ProfileInput): Promise<Profile>
```

## Validation Steps
1. **Username** - Policy check via `/lib/profile/usernamePolicy.ts`
2. **Address** - Zcash validation via `/lib/zcash/zcashUtils.ts`
3. **Uniqueness** - Check username not taken
4. **Links** - Validate URLs/handles

## Database Operations
```typescript
// Insert profile
const { data: profile } = await supabase
  .from('zcasher')
  .insert({
    name: normalizedUsername,
    display_name: displayName,
    slug: generateSlug(username),
    address: address,
    bio: bio,
    nearest_city_id: cityId
  })
  .select()
  .single();

// Insert links
if (links.length > 0) {
  await supabase
    .from('zcasher_links')
    .insert(links.map(l => ({
      profile_id: profile.id,
      provider: l.provider,
      value: l.value
    })));
}
```

## Zcash Address Handling
- Validates address format before storage
- Stores original address (preserves case for unified)
- `address_verified` defaults to false
- User must complete OTP flow to verify

## Error Handling
```typescript
// Common errors
{ error: 'Username already taken' }
{ error: 'Invalid Zcash address' }
{ error: 'Username contains invalid characters' }
{ error: 'Database error' }
```

## Testing Harness
- Mock Supabase client
- Test validation edge cases
- Verify slug generation
- Test link insertion

## Related Files
- `/ui/signup/` - Form components
- `/lib/profile/usernamePolicy.ts` - Validation rules
- `/lib/zcash/zcashUtils.ts` - Address validation
