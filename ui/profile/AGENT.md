# /ui/profile - Profile Components

## Purpose
Components for displaying and editing Zcash user profiles.
The primary UI for the zcash.me identity system.

## Components

### Display
| Component | File | Purpose |
|-----------|------|---------|
| `ProfileCard` | ProfileCard.tsx | Main profile display card |
| `ProfileCardContent` | ProfileCardContent.tsx | Card body rendering |
| `ProfileHeader` | ProfileHeader.tsx | Navigation with profile count |
| `ProfileAvatar` | ProfileAvatar.tsx | Avatar image with fallback |
| `ProfileLinkRow` | ProfileLinkRow.tsx | Individual link display |
| `VerifiedBadge` | VerifiedBadge.tsx | Checkmark for verified items |
| `CopyButton` | CopyButton.tsx | Copy address/link to clipboard |

### Editing
| Component | File | Purpose |
|-----------|------|---------|
| `ProfileEditor` | ProfileEditor.tsx | Full profile edit interface |
| `ProfileField` | ProfileField.tsx | Single editable field |
| `editorModals` | editorModals.tsx | Confirmation dialogs |

### Search
| Component | File | Purpose |
|-----------|------|---------|
| `ProfileSearchDropdown` | ProfileSearchDropdown.tsx | Search results dropdown |

### Modals
| Component | File | Purpose |
|-----------|------|---------|
| `AuthExplainerModal` | AuthExplainerModal.tsx | Explains verification |
| `RedirectModal` | RedirectModal.tsx | External link warning |

## Zcash-Specific Features

### Address Display
```tsx
<ProfileCard profile={profile} />
// Shows Zcash address prominently
// QR code for easy wallet scanning
// Copy button for address
```

### Verification Badge
```tsx
<VerifiedBadge verified={profile.address_verified} />
// Green checkmark if address proven via blockchain
```

### Link Verification
Each link can be verified independently:
```tsx
<ProfileLinkRow link={link} showVerified />
// Shows verification status per link
```

## State Management

### store.ts (Zustand)
Profile editing state - colocated with components:
```typescript
import { useEditsStore } from "@/ui/profile/store";

const { form, setForm, initializeForm } = useEditsStore();
```

State includes:
- `form` - Current form values
- `original` - Original values for diff
- `deletedFields` - Track field deletions
- `linkAuthTokens` - OAuth verification tokens

## Hooks

### useProfileLinks.ts
Manages link state for editing:
- Add/remove links
- Reorder links
- Track verification status

### useProfileEvents.ts
Analytics and event tracking for profile interactions.

## Testing Harness
- Components receive profile data via props
- Mock profile objects for unit tests
- Use design-system page for visual testing

## Types
See `/lib/profile/types.ts` for `Profile` and `ProfileLink` interfaces.
