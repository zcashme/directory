# Modal Components

A complete modal system with base components and pre-built dialogs, featuring animations, accessibility, and flexible layouts.

## Components

### Modal (Base Component)

Base modal structure with backdrop, animations, and size variants.

**Props:**
- `isOpen: boolean` - Whether the modal is open
- `onClose: () => void` - Callback when modal is closed
- `size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full'` - Size variant (default: 'md')
- `closeOnBackdrop?: boolean` - Close when clicking backdrop (default: true)
- `closeOnEscape?: boolean` - Close when pressing Escape key (default: true)
- `showCloseButton?: boolean` - Show close button in top-right (default: false)
- `className?: string` - Additional CSS classes
- `children: ReactNode` - Modal content

**Size Specifications:**
- `xs` - 320px
- `sm` - 384px
- `md` - 448px
- `lg` - 512px
- `xl` - 576px
- `full` - max-w-full with margin

**Example:**
```tsx
import { Modal } from '@/ui/common/modals';

function MyModal({ isOpen, onClose }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      closeOnBackdrop
      closeOnEscape
    >
      {/* Modal content */}
    </Modal>
  );
}
```

### ModalHeader

Header section with title and optional close button.

**Props:**
- `title: ReactNode` - Header title (can be string or custom element)
- `onClose?: () => void` - Callback when close button is clicked
- `showCloseButton?: boolean` - Show close button (auto-enabled if onClose provided)
- `className?: string` - Additional CSS classes

**Example:**
```tsx
import { ModalHeader } from '@/ui/common/modals';

<ModalHeader
  title="Edit Profile"
  onClose={handleClose}
  showCloseButton
/>
```

### ModalBody

Scrollable content area.

**Props:**
- `children: ReactNode` - Body content
- `scrollable?: boolean` - Enable vertical scrolling (default: true)
- `className?: string` - Additional CSS classes

**Example:**
```tsx
import { ModalBody } from '@/ui/common/modals';

<ModalBody scrollable>
  <p>This content can scroll if it's too long.</p>
</ModalBody>
```

### ModalFooter

Footer section for action buttons.

**Props:**
- `children: ReactNode` - Footer content (typically buttons)
- `className?: string` - Additional CSS classes

**Example:**
```tsx
import { ModalFooter } from '@/ui/common/modals';
import { Button } from '@/ui/common/buttons';

<ModalFooter>
  <Button variant="secondary" onClick={onCancel}>Cancel</Button>
  <Button variant="primary" onClick={onConfirm}>Save</Button>
</ModalFooter>
```

### ConfirmDialog

Pre-built confirmation dialog for common confirm/cancel flows.

**Props:**
- `isOpen: boolean` - Whether the dialog is open
- `onClose: () => void` - Callback when dialog is closed
- `onConfirm: () => void | Promise<void>` - Callback when confirm button is clicked
- `title: string` - Dialog title
- `message: string | ReactNode` - Dialog message
- `confirmText?: string` - Confirm button text (default: "Confirm")
- `cancelText?: string` - Cancel button text (default: "Cancel")
- `variant?: 'danger' | 'warning' | 'info' | 'primary'` - Visual variant (default: 'primary')
- `loading?: boolean` - Loading state
- `disabled?: boolean` - Disabled state

**Example:**
```tsx
import { ConfirmDialog } from '@/ui/common/modals';

<ConfirmDialog
  isOpen={isOpen}
  onClose={handleClose}
  onConfirm={handleDelete}
  title="Delete Account"
  message="This action cannot be undone. Are you sure you want to delete your account?"
  variant="danger"
  confirmText="Delete"
  cancelText="Cancel"
/>
```

## Usage Examples

### Basic Modal

```tsx
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/ui/common/modals';
import { Button } from '@/ui/common/buttons';

function WelcomeModal({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title="Welcome!" onClose={onClose} />
      <ModalBody>
        <p>Thanks for joining our platform.</p>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Get Started</Button>
      </ModalFooter>
    </Modal>
  );
}
```

### Form Modal

```tsx
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/ui/common/modals';
import { Button, Input } from '@/ui/common';
import { useState } from 'react';

function EditProfileModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader title="Edit Profile" onClose={onClose} />
      <ModalBody className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => onSave({ name, email })}>
          Save Changes
        </Button>
      </ModalFooter>
    </Modal>
  );
}
```

### Delete Confirmation

```tsx
import { ConfirmDialog } from '@/ui/common/modals';

function DeleteButton({ itemId, itemName }) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
    setShowConfirm(false);
  };

  return (
    <>
      <button onClick={() => setShowConfirm(true)}>Delete</button>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Item"
        message={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
        variant="danger"
        confirmText="Delete"
      />
    </>
  );
}
```

### Warning Dialog

```tsx
import { ConfirmDialog } from '@/ui/common/modals';

<ConfirmDialog
  isOpen={isOpen}
  onClose={onClose}
  onConfirm={handleProceed}
  title="Unsaved Changes"
  message={
    <div>
      <p>You have unsaved changes that will be lost.</p>
      <p className="mt-2">Do you want to continue without saving?</p>
    </div>
  }
  variant="warning"
  confirmText="Continue"
  cancelText="Go Back"
/>
```

### Non-dismissible Modal

```tsx
import { Modal, ModalHeader, ModalBody } from '@/ui/common/modals';

<Modal
  isOpen={isProcessing}
  onClose={() => {}}
  closeOnBackdrop={false}
  closeOnEscape={false}
  size="sm"
>
  <ModalHeader title="Processing..." />
  <ModalBody>
    <div className="text-center py-4">
      <Spinner size="lg" />
      <p className="mt-4 text-sm text-gray-600">Please wait...</p>
    </div>
  </ModalBody>
</Modal>
```

### Custom Styled Modal

```tsx
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/ui/common/modals';

<Modal
  isOpen={isOpen}
  onClose={onClose}
  size="xl"
  className="bg-gradient-to-br from-blue-50 to-purple-50"
>
  <ModalHeader
    title={<span className="text-purple-600">Special Offer!</span>}
    onClose={onClose}
  />
  <ModalBody className="space-y-4">
    <p className="text-lg font-semibold">Limited Time Deal</p>
    <p>Get 50% off your first month!</p>
  </ModalBody>
  <ModalFooter>
    <Button variant="primary" onClick={handleClaim}>
      Claim Offer
    </Button>
  </ModalFooter>
</Modal>
```

## Features

- **Portal Rendering**: Modals render to `document.body` via ModalPortal
- **Animations**: Smooth fade-in/scale animations using Framer Motion
- **Accessibility**: Escape key support and backdrop click handling
- **Flexible Sizing**: Multiple size variants from xs to full screen
- **Composable**: Mix and match header, body, and footer components
- **TypeScript**: Full type safety with exported interfaces
- **Async Support**: ConfirmDialog handles async operations gracefully

## Styling

All modal components use the design system's standard styling:
- Background: `bg-white/85` with `backdrop-blur-md`
- Border: `border-black/30`
- Shadow: `shadow-xl`
- Backdrop: `bg-black/50` with `backdrop-blur-xs`
- Border radius: `rounded-2xl`

## Accessibility

- Escape key closes modals (can be disabled)
- Backdrop click closes modals (can be disabled)
- Proper ARIA labels on close buttons
- Focus management with Framer Motion

## Integration

Import from the main common components barrel:

```tsx
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ConfirmDialog
} from '@/ui/common';
```

Or directly from the modals directory:

```tsx
import { Modal } from '@/ui/common/modals';
```
