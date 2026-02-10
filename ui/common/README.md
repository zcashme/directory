# Component Library

A comprehensive design system providing reusable, accessible components with consistent styling across the application.

## Installation

```tsx
import { Button, Card, Badge } from '@/ui/common'
```

Individual component imports are also supported:

```tsx
import Button from '@/ui/common/buttons/Button'
import Card from '@/ui/common/layout/Card'
```

---

## Buttons

### Button

Base button component with multiple variants and sizes.

**Props:**
- `variant?: "primary" | "secondary" | "danger" | "ghost"` - Visual style variant
- `size?: "xs" | "sm" | "md" | "lg"` - Button size
- `disabled?: boolean` - Disabled state
- `loading?: boolean` - Loading state (shows disabled styling)
- `className?: string` - Additional CSS classes

**Examples:**

```tsx
// Primary button (default)
<Button variant="primary" size="md" onClick={handleSubmit}>
  Submit
</Button>

// Secondary button
<Button variant="secondary" onClick={handleCancel}>
  Cancel
</Button>

// Danger button for destructive actions
<Button variant="danger" onClick={handleDelete}>
  Delete
</Button>

// Ghost button (no border, minimal styling)
<Button variant="ghost" size="sm">
  Learn More
</Button>

// Disabled state
<Button disabled>
  Cannot Click
</Button>

// Loading state
<Button loading>
  Saving...
</Button>
```

---

### CopyButton

Button that copies text to clipboard with visual feedback.

**Props:**
- `text: string` - Text to copy to clipboard (required)
- `label?: string` - Label shown on hover (default: "Copy")
- `copiedLabel?: string` - Label shown after copying (default: "Copied")
- `icon?: string` - Icon shown in default state (default: "⧉")
- `copiedIcon?: string` - Icon shown after copying (default: "⮼")
- `timeout?: number` - Duration in ms to show "copied" state (default: 2000)
- `size?: "xs" | "sm" | "md"` - Button size

**Examples:**

```tsx
// Basic usage
<CopyButton text="Hello World" />

// Custom labels
<CopyButton
  text="z1abc..."
  label="Copy Address"
  copiedLabel="Copied!"
  size="md"
/>

// Custom icons
<CopyButton
  text="API Key: sk_..."
  icon="📋"
  copiedIcon="✅"
/>
```

**Features:**
- Smooth expand/collapse animation on hover
- Visual feedback when text is copied (color change, icon change)
- Configurable timeout for feedback display
- Stops event propagation to prevent parent click handlers

---

### IconButton

Icon-only button variant with consistent sizing.

**Props:**
- `variant?: "primary" | "secondary" | "danger" | "ghost"` - Visual style variant
- `size?: "xs" | "sm" | "md" | "lg"` - Button size
- `disabled?: boolean` - Disabled state
- `className?: string` - Additional CSS classes

**Examples:**

```tsx
// Close button
<IconButton variant="ghost" size="sm" title="Close" onClick={handleClose}>
  ✕
</IconButton>

// Edit button
<IconButton variant="primary" size="md" title="Edit" onClick={handleEdit}>
  ✎
</IconButton>

// Delete button
<IconButton variant="danger" title="Delete" onClick={handleDelete}>
  🗑
</IconButton>
```

**Note:** Always provide a `title` attribute for accessibility.

---

## Layout

### Card

Container component with consistent border, background, and shadow styling.

**Props:**
- `padding?: "none" | "sm" | "md" | "lg"` - Padding size (default: "md")
- `shadow?: "none" | "sm" | "md" | "lg" | "xl"` - Shadow depth (default: "sm")
- `rounded?: "md" | "lg" | "xl" | "2xl"` - Border radius size (default: "2xl")
- `className?: string` - Additional CSS classes

**Examples:**

```tsx
// Basic card
<Card>
  <h2>Profile Information</h2>
  <p>Content goes here...</p>
</Card>

// Large card with more padding and shadow
<Card padding="lg" shadow="lg">
  <div>Important content</div>
</Card>

// Card with no padding (for custom layouts)
<Card padding="none">
  <img src="/banner.jpg" alt="Banner" />
  <div className="p-4">
    <h3>Custom Layout</h3>
  </div>
</Card>
```

---

### Section

Section container with optional collapsible functionality.

**Props:**
- `title: ReactNode` - Section title (required)
- `defaultOpen?: boolean` - Whether section starts open (default: true)
- `collapsible?: boolean` - Whether section can be collapsed (default: false)
- `headerAction?: ReactNode` - Optional action element in header
- `className?: string` - Additional CSS classes

**Examples:**

```tsx
// Basic section
<Section title="Account Details">
  <p>Your account information...</p>
</Section>

// Collapsible section
<Section title="Advanced Settings" collapsible defaultOpen={false}>
  <div>Settings content...</div>
</Section>

// Section with header action
<Section
  title="Profile Links"
  headerAction={<Button size="xs">Add Link</Button>}
>
  <div>Links list...</div>
</Section>
```

**Features:**
- Optional collapsible behavior with smooth animation
- Arrow indicator for collapsible sections
- Header action slot for buttons, badges, etc.
- Smooth max-height and opacity transitions

---

### Divider

Horizontal divider for visual separation.

**Props:**
- `variant?: "solid" | "dashed" | "dotted" | "gradient"` - Visual style variant (default: "solid")
- `spacing?: "none" | "xs" | "sm" | "md" | "lg" | "xl"` - Vertical spacing (default: "md")
- `label?: ReactNode` - Optional centered label
- `className?: string` - Additional CSS classes

**Examples:**

```tsx
// Basic divider
<Divider />

// Dashed divider with spacing
<Divider variant="dashed" spacing="lg" />

// Gradient divider
<Divider variant="gradient" />

// Divider with label
<Divider label="OR" />
```

---

## Feedback

### Badge

Status badge component with multiple variants and optional expansion animation.

**Props:**
- `variant?: "success" | "warning" | "error" | "info" | "neutral"` - Visual style variant (default: "neutral")
- `size?: "xs" | "sm" | "md"` - Badge size (default: "sm")
- `expandable?: boolean` - Enable expansion animation on hover/touch (default: false)
- `alwaysExpanded?: boolean` - Keep badge always expanded (default: false)
- `icon?: ReactNode` - Optional icon to display before text
- `onClick?: () => void` - Click handler (makes badge interactive)
- `className?: string` - Additional CSS classes

**Examples:**

```tsx
// Success badge
<Badge variant="success">Verified</Badge>

// Warning badge
<Badge variant="warning" size="sm">Pending</Badge>

// Expandable badge (collapses on non-hover)
<Badge variant="info" expandable>
  Click for details
</Badge>

// Badge with icon
<Badge variant="error" icon="⚠">
  Failed
</Badge>

// Interactive badge
<Badge variant="neutral" onClick={handleClick}>
  View More
</Badge>
```

**Features:**
- Multiple color variants for different states
- Optional expansion animation on hover/touch
- Auto-collapse after 2 seconds when expanded via touch
- Optional icon support
- Interactive mode with onClick handler

---

### Spinner

Loading spinner indicator.

**Props:**
- `size?: "xs" | "sm" | "md" | "lg" | "xl"` - Spinner size (default: "md")
- `color?: "gray" | "blue" | "green" | "red"` - Spinner color (default: "blue")
- `className?: string` - Additional CSS classes

**Examples:**

```tsx
// Basic spinner
<Spinner />

// Large green spinner
<Spinner size="lg" color="green" />

// Small gray spinner
<Spinner size="sm" color="gray" />
```

**Features:**
- Lightweight CSS animation
- No dependencies
- Accessible with ARIA attributes

---

### Alert

Alert message component for displaying feedback to users.

**Props:**
- `variant?: "error" | "warning" | "success" | "info"` - Visual style variant (default: "info")
- `size?: "sm" | "md"` - Alert size (default: "sm")
- `message?: string | ReactNode` - Message to display
- `children?: ReactNode` - Content (alternative to message prop)
- `dismissible?: boolean` - Whether alert can be dismissed (default: false)
- `onDismiss?: () => void` - Callback when alert is dismissed
- `className?: string` - Additional CSS classes

**Examples:**

```tsx
// Error alert
<Alert variant="error" message="Invalid email address" />

// Success alert with dismiss
<Alert
  variant="success"
  message="Profile updated successfully"
  dismissible
  onDismiss={() => console.log('dismissed')}
/>

// Warning alert with custom content
<Alert variant="warning" size="md">
  <div>
    <strong>Warning:</strong> This action cannot be undone.
  </div>
</Alert>

// Info alert
<Alert variant="info">
  <p>Your verification code has been sent to your email.</p>
</Alert>
```

**Features:**
- Multiple variants for different message types
- Optional dismiss functionality
- Configurable sizes
- Supports both string messages and ReactNode children
- Accessible with ARIA attributes

---

## Forms

### Dropdown

Generic dropdown component with search functionality and floating-UI positioning.

**Added in:** Phase 2.3

**Props:**
- `options: DropdownOption<T>[]` - Array of options to display (required)
- `value?: T` - Currently selected value (option id)
- `onChange: (value: T) => void` - Callback when selection changes (required)
- `placeholder?: string` - Placeholder text (default: "Select an option")
- `searchable?: boolean` - Enable search functionality (default: false)
- `searchPlaceholder?: string` - Search input placeholder (default: "Search...")
- `filterFn?: (option, search) => boolean` - Custom filter function
- `renderOption?: (option) => ReactNode` - Custom option renderer
- `className?: string` - Additional CSS classes
- `disabled?: boolean` - Disable the dropdown (default: false)
- `label?: string` - Label above dropdown
- `error?: string` - Error message below dropdown

**Examples:**

```tsx
// Simple dropdown
<Dropdown
  options={[
    { id: 'usd', label: 'US Dollar', description: 'USD' },
    { id: 'eur', label: 'Euro', description: 'EUR' }
  ]}
  value={currency}
  onChange={setCurrency}
  placeholder="Select currency"
/>

// Searchable with icons
<Dropdown
  options={[
    { id: 'btc', label: 'Bitcoin', icon: <img src="/btc.png" /> },
    { id: 'eth', label: 'Ethereum', icon: <img src="/eth.png" /> }
  ]}
  value={token}
  onChange={setToken}
  searchable
  searchPlaceholder="Search tokens..."
/>

// With custom rendering
<Dropdown
  options={users}
  value={userId}
  onChange={setUserId}
  renderOption={(option) => (
    <div className="flex items-center gap-2">
      <img src={option.avatar} className="w-6 h-6 rounded-full" />
      <span>{option.label}</span>
    </div>
  )}
/>

// With label and error
<Dropdown
  label="Country"
  options={countryOptions}
  value={country}
  onChange={setCountry}
  error={errors.country}
/>
```

**Features:**
- Search with customizable filtering
- Keyboard navigation (Arrow keys, Enter, Escape)
- Click outside to close
- Floating-UI positioning (auto-flip, auto-shift)
- Support for icons and descriptions
- Custom option rendering
- Generic type support for type-safe IDs
- Accessible with ARIA attributes

**See also:** `/ui/common/forms/README.md` for detailed documentation and examples.

---

## Animations

### Animation Variants

Pre-configured Framer Motion animation variants for consistent transitions throughout the application.

**Added in:** Phase 3.2

**Philosophy:**
- **Fast & Responsive:** Durations range from 0.15s to 0.22s for snappy feel
- **Subtle Motion:** Small offsets (20-40px) and scale changes (0.95-1.0)
- **Purposeful:** Each variant serves a specific UI pattern
- **Accessible:** All animations respect `prefers-reduced-motion` (handled by Framer Motion)

**Available Variants:**

#### fadeIn
Simple opacity fade for subtle content appearance/disappearance.

```tsx
import { motion } from 'framer-motion'
import { fadeIn } from '@/ui/common'

<motion.div
  variants={fadeIn}
  initial="initial"
  animate="animate"
  exit="exit"
>
  Content
</motion.div>
```

#### scaleIn
Scale + opacity transition for elements that should feel like they're popping into view. Great for cards, tooltips, and small UI elements.

```tsx
<motion.div variants={scaleIn} initial="initial" animate="animate" exit="exit">
  Card content
</motion.div>
```

#### slideIn
Horizontal slide animation for multi-step flows, wizards, or carousels. Accepts a custom direction parameter: positive = left-to-right, negative = right-to-left.

```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { slideIn } from '@/ui/common'

const [step, setStep] = useState(0)
const [direction, setDirection] = useState(1)

<AnimatePresence mode="wait" custom={direction}>
  <motion.div
    key={step}
    custom={direction}
    variants={slideIn}
    initial="initial"
    animate="animate"
    exit="exit"
  >
    Step {step}
  </motion.div>
</AnimatePresence>
```

**Reference:** See `ui/signup/StepContainer.tsx` for implementation example.

#### slideUp
Vertical slide from bottom to top, good for success messages, notifications, or content that should feel like it's "rising" into view.

```tsx
<motion.div variants={slideUp} initial="initial" animate="animate" exit="exit">
  Notification message
</motion.div>
```

#### slideDown
Vertical slide from top to bottom, ideal for dropdowns, menus, or content that should feel like it's "dropping" into view.

```tsx
<motion.div variants={slideDown} initial="initial" animate="animate" exit="exit">
  Dropdown content
</motion.div>
```

#### expandCollapse
Height-based animation for accordion-style content or expandable sections. Uses 'auto' height for flexible content sizes.

```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { expandCollapse } from '@/ui/common'

const [isOpen, setIsOpen] = useState(false)

<AnimatePresence>
  {isOpen && (
    <motion.div
      variants={expandCollapse}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      Expandable content
    </motion.div>
  )}
</AnimatePresence>
```

**Note:** For CSS-based expand/collapse alternatives, see `ui/profile/VerifiedBadge.tsx`.

#### modalVariant + backdropVariant
Combined scale + opacity for modal dialogs with backdrop fade.

```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { modalVariant, backdropVariant } from '@/ui/common'

const [isOpen, setIsOpen] = useState(false)

<AnimatePresence>
  {isOpen && (
    <>
      <motion.div
        variants={backdropVariant}
        initial="initial"
        animate="animate"
        exit="exit"
        className="fixed inset-0 bg-black/60"
        onClick={onClose}
      />
      <motion.div
        variants={modalVariant}
        initial="initial"
        animate="animate"
        exit="exit"
        className="fixed inset-0 flex items-center justify-center"
      >
        <div className="bg-white rounded-lg p-6">
          Modal content
        </div>
      </motion.div>
    </>
  )}
</AnimatePresence>
```

**Reference:** See `ui/verification/SubmitOtp.tsx` for modal implementation (uses Tailwind animate-in).

**Duration Values:**
- Animate: 0.2-0.22s (entrance)
- Exit: 0.15-0.18s (exit, slightly faster)

**See also:** `/ui/common/animations/index.ts` for comprehensive usage documentation.

---

## Design Tokens

### Colors

**Primary Actions:**
- Blue: `text-blue-700`, `bg-blue-50`, `border-blue-600`

**Secondary Actions:**
- Gray: `text-gray-700`, `bg-gray-100`, `border-black/30`

**Status:**
- Success: `text-green-700`, `bg-green-50`, `border-green-600`
- Warning: `text-yellow-800`, `bg-yellow-50`, `border-yellow-300`
- Error: `text-red-600`, `bg-red-50`, `border-red-400`
- Info: `text-blue-700`, `bg-blue-50`, `border-blue-400`

### Spacing

- **xs:** 0.25rem (4px)
- **sm:** 0.5rem (8px)
- **md:** 1rem (16px)
- **lg:** 1.5rem (24px)
- **xl:** 2rem (32px)

### Border Radius

- **md:** 0.375rem (6px)
- **lg:** 0.5rem (8px)
- **xl:** 0.75rem (12px)
- **2xl:** 1rem (16px)

### Shadows

- **sm:** `shadow-sm`
- **md:** `shadow-md`
- **lg:** `shadow-lg`
- **xl:** `shadow-xl`

---

## Best Practices

### Component Composition

Compose complex UIs from simple primitives:

```tsx
function ProfileSection() {
  return (
    <Card padding="lg">
      <Section title="Profile Information">
        <div className="space-y-4">
          <div>
            <Badge variant="success" icon="✓">Verified</Badge>
          </div>
          <Divider spacing="sm" />
          <div>
            <Button variant="primary">Edit Profile</Button>
          </div>
        </div>
      </Section>
    </Card>
  )
}
```

### Accessibility

- Always provide `title` attributes for icon-only buttons
- Use semantic HTML elements (`<button>`, `<nav>`, etc.)
- Include ARIA labels where appropriate
- Test keyboard navigation (Tab, Enter, Escape)
- Verify screen reader compatibility

### Performance

- Components use CSS for animations (GPU-accelerated)
- No heavy dependencies
- Tree-shakeable exports
- Minimal bundle impact

---

## Migration Guide

### From Inline Buttons

**Before:**
```tsx
<button className="py-2.5 px-5 rounded-xl border border-black/30 text-sm font-medium text-blue-700 hover:border-blue-600 hover:bg-blue-50">
  Submit
</button>
```

**After:**
```tsx
<Button variant="primary" size="lg">Submit</Button>
```

### From Inline Alerts

**Before:**
```tsx
<p className="text-xs text-red-600">Invalid email address</p>
```

**After:**
```tsx
<Alert variant="error" size="sm" message="Invalid email address" />
```

---

## Contributing

When adding new components:

1. Follow the existing component structure
2. Include comprehensive JSDoc comments
3. Export types separately
4. Add examples to this README
5. Test with multiple variants and edge cases
6. Verify TypeScript compilation
7. Check accessibility with keyboard and screen reader

---

## Modals

Complete modal system with base components and pre-built dialogs.

### Modal

Base modal component with backdrop, animations, and size variants.

**Props:**
- `isOpen: boolean` - Whether the modal is open (required)
- `onClose: () => void` - Callback when modal is closed (required)
- `size?: "xs" | "sm" | "md" | "lg" | "xl" | "full"` - Size variant (default: "md")
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
- `full` - Full screen with margin

**Example:**

```tsx
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/ui/common';

function MyModal({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title="Welcome!" onClose={onClose} />
      <ModalBody>
        <p>This is a basic modal.</p>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Close</Button>
      </ModalFooter>
    </Modal>
  );
}
```

---

### ModalHeader

Header section with title and optional close button.

**Props:**
- `title: ReactNode` - Header title (can be string or custom element)
- `onClose?: () => void` - Callback when close button is clicked
- `showCloseButton?: boolean` - Show close button (auto-enabled if onClose provided)
- `className?: string` - Additional CSS classes

**Example:**

```tsx
<ModalHeader title="Edit Profile" onClose={handleClose} />

// Custom title styling
<ModalHeader
  title={<span className="text-purple-600">Special Title</span>}
  onClose={handleClose}
/>
```

---

### ModalBody

Scrollable content area.

**Props:**
- `children: ReactNode` - Body content
- `scrollable?: boolean` - Enable vertical scrolling (default: true)
- `className?: string` - Additional CSS classes

**Example:**

```tsx
<ModalBody scrollable>
  <p>This content can scroll if needed.</p>
</ModalBody>

// Non-scrollable for short content
<ModalBody scrollable={false} className="space-y-4">
  <Input label="Name" />
  <Input label="Email" />
</ModalBody>
```

---

### ModalFooter

Footer section for action buttons.

**Props:**
- `children: ReactNode` - Footer content (typically buttons)
- `className?: string` - Additional CSS classes

**Example:**

```tsx
<ModalFooter>
  <Button variant="secondary" onClick={onCancel}>Cancel</Button>
  <Button variant="primary" onClick={onConfirm}>Save</Button>
</ModalFooter>

// Custom layout
<ModalFooter className="justify-between">
  <Button variant="ghost">Learn More</Button>
  <Button onClick={onClose}>Close</Button>
</ModalFooter>
```

---

### ConfirmDialog

Pre-built confirmation dialog for common confirm/cancel flows.

**Props:**
- `isOpen: boolean` - Whether the dialog is open (required)
- `onClose: () => void` - Callback when dialog is closed (required)
- `onConfirm: () => void | Promise<void>` - Callback when confirm button is clicked (required)
- `title: string` - Dialog title (required)
- `message: string | ReactNode` - Dialog message (required)
- `confirmText?: string` - Confirm button text (default: "Confirm")
- `cancelText?: string` - Cancel button text (default: "Cancel")
- `variant?: "danger" | "warning" | "info" | "primary"` - Visual variant (default: "primary")
- `loading?: boolean` - Loading state
- `disabled?: boolean` - Disabled state

**Examples:**

```tsx
// Delete confirmation
<ConfirmDialog
  isOpen={isOpen}
  onClose={handleClose}
  onConfirm={handleDelete}
  title="Delete Account"
  message="This action cannot be undone. Are you sure?"
  variant="danger"
  confirmText="Delete"
/>

// Warning dialog with custom message
<ConfirmDialog
  isOpen={isOpen}
  onClose={handleClose}
  onConfirm={handleProceed}
  title="Unsaved Changes"
  message={
    <div>
      <p>You have unsaved changes that will be lost.</p>
      <p className="mt-2">Do you want to continue?</p>
    </div>
  }
  variant="warning"
  confirmText="Continue"
  cancelText="Go Back"
/>

// Async operation
<ConfirmDialog
  isOpen={isOpen}
  onClose={handleClose}
  onConfirm={async () => {
    await saveData();
  }}
  title="Save Changes"
  message="Save your changes?"
  variant="primary"
/>
```

**Complete Modal Example:**

```tsx
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/ui/common';
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

---

## Support

For issues or feature requests, please open an issue on the project repository.
