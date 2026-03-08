# /ui/common - Design System

## Purpose
Reusable UI components used across all pages. Direct imports (no barrel exports)
for tree-shaking. Visit `/design-system` to see all components rendered.

## Components

### buttons/
| Component | Feature |
|-----------|---------|
| `Button.tsx` | Action button with variants (primary/secondary/danger/ghost) and sizes (xs-lg) |
| `IconButton.tsx` | Icon-only button for close, edit, and compact actions |
| `CopyButton.tsx` | Copy-to-clipboard with visual feedback (icon change + "Copied" label) |

### feedback/
| Component | Feature |
|-----------|---------|
| `Alert.tsx` | Info/warning/error/success messages, optional dismiss |
| `Badge.tsx` | Status indicators with gradient backgrounds, expandable on hover/touch |
| `Spinner.tsx` | Animated loading indicator, sizes xs-xl, color variants |

### forms/
| Component | Feature |
|-----------|---------|
| `Input.tsx` | Text input with validation states, multiple types (text/email/url/number/tel/password/search) |
| `TextArea.tsx` | Multi-line input with row control and validation |
| `Checkbox.tsx` | Checkbox with flexible label positioning and sizes |
| `Select.tsx` | Native select dropdown with styled arrow |
| `Dropdown.tsx` | Custom searchable dropdown with keyboard nav, floating-ui positioning, icon/description support |
| `FormField.tsx` | Field wrapper with label, HelpIcon tooltip, error display, hint text, required indicator |
| `FieldMessages.tsx` | Shared error/info message rendering for form fields |
| `useFieldValidation.ts` | Hook for validation state, border styling, and message display |

### layout/
| Component | Feature |
|-----------|---------|
| `Card.tsx` | Content container with configurable padding (none/sm/md/lg) and shadow |
| `Section.tsx` | Collapsible page section with smooth height/opacity animation |
| `Divider.tsx` | Separator with variants (solid/dashed/dotted/gradient) and optional label |
| `FloatingSidebarMenu.tsx` | Floating navigation menu across sub-apps |

### modals/
| Component | Feature |
|-----------|---------|
| `Modal.tsx` | Base modal with backdrop blur, Escape key, click-outside close, size variants (xs-full) |
| `ModalHeader.tsx` | Title bar with close button |
| `ModalBody.tsx` | Scrollable content area (max-h 60vh) |
| `ModalFooter.tsx` | Footer with right-aligned action buttons |
| `ConfirmDialog.tsx` | Yes/No dialog with variants (danger/warning/info/primary), async support |
| `TutorialModal.tsx` | Multi-step tutorial with progress bar, video embedding, step navigation |

### Root
| Component | Feature |
|-----------|---------|
| `HelpIcon.tsx` | Tooltip trigger (?) — hover on desktop, click on touch |
| `ModalPortal.tsx` | React Portal wrapper rendering modals to document.body |

## Import Pattern
```typescript
import Button from '@/ui/common/buttons/Button';
import FormField from '@/ui/common/forms/FormField';
import Modal from '@/ui/common/modals/Modal';
```
