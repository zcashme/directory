# Modal Components - Quick Reference

## Import

```tsx
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ConfirmDialog
} from '@/ui/common';
```

## Basic Usage

### Simple Modal
```tsx
<Modal isOpen={isOpen} onClose={onClose}>
  <ModalHeader title="Title" onClose={onClose} />
  <ModalBody>Content</ModalBody>
  <ModalFooter>
    <Button onClick={onClose}>Close</Button>
  </ModalFooter>
</Modal>
```

### Confirmation Dialog
```tsx
<ConfirmDialog
  isOpen={isOpen}
  onClose={onClose}
  onConfirm={handleAction}
  title="Confirm Action"
  message="Are you sure?"
  variant="danger"
/>
```

## Props Cheatsheet

### Modal
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | - | **Required.** Modal visibility |
| `onClose` | `() => void` | - | **Required.** Close handler |
| `size` | `'xs'｜'sm'｜'md'｜'lg'｜'xl'｜'full'` | `'md'` | Modal width |
| `closeOnBackdrop` | `boolean` | `true` | Close on backdrop click |
| `closeOnEscape` | `boolean` | `true` | Close on Escape key |
| `showCloseButton` | `boolean` | `false` | Show X button |

### ModalHeader
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `ReactNode` | - | **Required.** Header title |
| `onClose` | `() => void` | - | Close button handler |
| `showCloseButton` | `boolean` | auto | Show close button |

### ModalBody
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | **Required.** Body content |
| `scrollable` | `boolean` | `true` | Enable scrolling |

### ModalFooter
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | - | **Required.** Footer buttons |

### ConfirmDialog
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | - | **Required.** Dialog visibility |
| `onClose` | `() => void` | - | **Required.** Close handler |
| `onConfirm` | `() => void｜Promise<void>` | - | **Required.** Confirm handler |
| `title` | `string` | - | **Required.** Dialog title |
| `message` | `string｜ReactNode` | - | **Required.** Dialog message |
| `variant` | `'danger'｜'warning'｜'info'｜'primary'` | `'primary'` | Visual style |
| `confirmText` | `string` | `'Confirm'` | Confirm button text |
| `cancelText` | `string` | `'Cancel'` | Cancel button text |
| `loading` | `boolean` | `false` | Loading state |
| `disabled` | `boolean` | `false` | Disabled state |

## Size Reference

| Size | Width | Use Case |
|------|-------|----------|
| `xs` | 320px | Small alerts, simple confirmations |
| `sm` | 384px | Short forms, quick actions |
| `md` | 448px | **Default.** Standard dialogs |
| `lg` | 512px | Longer forms, detailed content |
| `xl` | 576px | Complex forms, data-heavy |
| `full` | Full width | Image viewers, rich content |

## Variant Reference

| Variant | Color | Use Case |
|---------|-------|----------|
| `primary` | Blue | Default actions, confirmations |
| `danger` | Red | Delete, destructive actions |
| `warning` | Yellow | Warnings, unsaved changes |
| `info` | Blue | Informational messages |

## Common Patterns

### Delete Confirmation
```tsx
<ConfirmDialog
  isOpen={showDelete}
  onClose={() => setShowDelete(false)}
  onConfirm={async () => {
    await deleteItem();
    setShowDelete(false);
  }}
  title="Delete Item"
  message="This action cannot be undone."
  variant="danger"
  confirmText="Delete"
/>
```

### Form Modal
```tsx
<Modal isOpen={isOpen} onClose={onClose} size="lg">
  <ModalHeader title="Edit Profile" onClose={onClose} />
  <ModalBody className="space-y-4">
    <Input label="Name" value={name} onChange={setName} />
    <Input label="Email" value={email} onChange={setEmail} />
  </ModalBody>
  <ModalFooter>
    <Button variant="secondary" onClick={onClose}>Cancel</Button>
    <Button variant="primary" onClick={handleSave}>Save</Button>
  </ModalFooter>
</Modal>
```

### Non-dismissible Modal
```tsx
<Modal
  isOpen={isProcessing}
  onClose={() => {}}
  closeOnBackdrop={false}
  closeOnEscape={false}
  size="sm"
>
  <ModalHeader title="Processing..." />
  <ModalBody>
    <Spinner />
    <p>Please wait...</p>
  </ModalBody>
</Modal>
```

### Warning Dialog
```tsx
<ConfirmDialog
  isOpen={hasUnsaved}
  onClose={() => setHasUnsaved(false)}
  onConfirm={handleLeave}
  title="Unsaved Changes"
  message="You have unsaved changes. Continue without saving?"
  variant="warning"
  confirmText="Leave Without Saving"
  cancelText="Go Back"
/>
```

## Styling Tips

- Add `className="space-y-4"` to ModalBody for spaced content
- Use `className="justify-between"` on ModalFooter for split buttons
- Combine sizes with custom content for flexible layouts
- Use ReactNode in message for rich content

## Accessibility

- ✓ Escape key closes modals (configurable)
- ✓ Backdrop click closes modals (configurable)
- ✓ ARIA labels on close buttons
- ✓ Focus management built-in
- ✓ Keyboard navigation support

## Files Location

```
ui/common/modals/
├── Modal.tsx
├── ModalHeader.tsx
├── ModalBody.tsx
├── ModalFooter.tsx
├── ConfirmDialog.tsx
└── index.ts
```

## Documentation

- Full docs: `/ui/common/modals/README.md`
- Examples: `/ui/common/modals/examples.tsx`
- Implementation: `/ui/common/modals/IMPLEMENTATION.md`
