# /ui/common - Design System

## Purpose
Core design system components. Building blocks for all UI in zcash.me.
~3500 LOC of reusable, accessible components.

## Components

### Forms
| Component | Purpose |
|-----------|---------|
| `Input` | Text input with validation states |
| `TextArea` | Multi-line text input |
| `Checkbox` | Checkbox with label |
| `Select` | Native select dropdown |
| `Dropdown` | Custom dropdown with search |
| `FormField` | Wrapper with label and error |

### Buttons
| Component | Purpose |
|-----------|---------|
| `Button` | Primary action button |
| `IconButton` | Icon-only button |
| `CopyButton` | Copy-to-clipboard with feedback |

### Layout
| Component | Purpose |
|-----------|---------|
| `Card` | Content container with shadow |
| `Section` | Page section with heading |
| `Divider` | Visual separator |

### Modals
| Component | Purpose |
|-----------|---------|
| `Modal` | Base modal component |
| `ModalHeader` | Modal title bar |
| `ModalBody` | Modal content area |
| `ModalFooter` | Modal action buttons |
| `ConfirmDialog` | Yes/No confirmation |
| `TutorialModal` | Large tutorial/onboarding |
| `ModalPortal` | Portal for modal rendering |

### Feedback
| Component | Purpose |
|-----------|---------|
| `Alert` | Info/warning/error messages |
| `Badge` | Status indicators |
| `Spinner` | Loading indicator |

### Utilities
| Component | Purpose |
|-----------|---------|
| `HelpIcon` | Tooltip trigger icon |
| `Transitions` | Animation wrappers |

## Usage Pattern
```typescript
import { Button, Input, Modal, Card } from '@/ui/common';

<Card>
  <Input placeholder="Username" />
  <Button onClick={submit}>Save</Button>
</Card>
```

## Styling Conventions
- TailwindCSS utilities
- Consistent spacing scale (4px base)
- Color palette via Tailwind config
- Responsive: mobile-first

## Testing Harness
Visit `/app/design-system` to see all components rendered.
Good for visual regression testing.

## Adding Components
1. Create `ComponentName.tsx`
2. Export from `index.ts`
3. Add example to design-system page
4. Keep API minimal - props over config
