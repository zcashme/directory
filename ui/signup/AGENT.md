# /ui/signup - Profile Creation Forms

## Purpose
Multi-step form components for creating new Zcash profiles.
Guides users through username, address, bio, and link setup.

## Components

| Component | File | Purpose |
|-----------|------|---------|
| `AddUserForm` | AddUserForm.tsx | Main multi-step form |
| `StepContainer` | StepContainer.tsx | Step wrapper with progress |
| `ZcashAddressInput` | ZcashAddressInput.tsx | Address input + validation |
| `LinkInput` | LinkInput.tsx | Generic link input |
| `SocialLinkInput` | SocialLinkInput.tsx | Social media handle input |
| `CitySearchDropdown` | CitySearchDropdown.tsx | Location selection |

## Signup Flow

```
┌─────────────────────────────────────┐
│  Step 1: Basic Info                 │
│  ┌─────────────────────────────┐    │
│  │ Username: alice             │    │
│  │ Display Name: Alice Z       │    │
│  │ Short Bio: Zcash enthusiast │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  Step 2: Zcash Address              │
│  ┌─────────────────────────────┐    │
│  │ u1qw3rty...                 │ ✓  │
│  └─────────────────────────────┘    │
│  ⚠️ Use a unified address for       │
│     maximum privacy                 │
├─────────────────────────────────────┤
│  Step 3: Links (Optional)           │
│  ┌─────────────────────────────┐    │
│  │ Twitter: @alice             │    │
│  │ GitHub: alice               │    │
│  │ [+ Add Link]                │    │
│  └─────────────────────────────┘    │
├─────────────────────────────────────┤
│  Step 4: Location (Optional)        │
│  ┌─────────────────────────────┐    │
│  │ City: San Francisco, CA     │ ▼  │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

## Zcash Address Validation

`ZcashAddressInput` provides real-time validation:
```typescript
<ZcashAddressInput
  value={address}
  onChange={setAddress}
  onValidation={({ valid, type, hint }) => { ... }}
/>
```

- Shows address type (unified, sapling, transparent)
- Warns about transparent address privacy
- Blocks viewing keys
- Hints toward unified addresses

## Username Validation
Uses `/lib/profile/usernamePolicy.ts`:
- 3-30 characters
- Alphanumeric + underscore only
- No reserved words
- Profanity filter

## Server Action
Form submits to `createProfileAction`:
```typescript
import { createProfileAction } from '@/lib/signup/createProfileAction';

const result = await createProfileAction({
  username,
  displayName,
  bio,
  address,
  links,
  cityId
});
```

## Testing Harness
- Mock `createProfileAction` for form tests
- Test each step independently
- Validate address input edge cases
- Check city search dropdown behavior
