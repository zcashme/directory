/**
 * Common UI Components Library
 *
 * A comprehensive design system providing reusable, accessible components
 * with consistent styling across the application.
 *
 * @example
 * ```tsx
 * import { Button, Card, Badge } from '@/ui/common'
 *
 * function MyComponent() {
 *   return (
 *     <Card>
 *       <Badge variant="success">Active</Badge>
 *       <Button variant="primary">Click me</Button>
 *     </Card>
 *   )
 * }
 * ```
 */

// Buttons
export { default as Button } from "./buttons/Button";
export type { ButtonProps } from "./buttons/Button";

export { default as CopyButton } from "./buttons/CopyButton";
export type { CopyButtonProps } from "./buttons/CopyButton";

export { default as IconButton } from "./buttons/IconButton";
export type { IconButtonProps } from "./buttons/IconButton";

// Layout
export { default as Card } from "./layout/Card";
export type { CardProps } from "./layout/Card";

export { default as Section } from "./layout/Section";
export type { SectionProps } from "./layout/Section";

export { default as Divider } from "./layout/Divider";
export type { DividerProps } from "./layout/Divider";

// Feedback
export { default as Badge } from "./feedback/Badge";
export type { BadgeProps } from "./feedback/Badge";

export { default as Spinner } from "./feedback/Spinner";
export type { SpinnerProps } from "./feedback/Spinner";

export { default as Alert } from "./feedback/Alert";
export type { AlertProps } from "./feedback/Alert";

// Forms
export { default as Dropdown } from "./forms/Dropdown";
export type { DropdownProps } from "./forms/Dropdown";

export { default as DropdownOptionComponent } from "./forms/DropdownOption";
export type {
  DropdownOption,
  DropdownOptionComponentProps,
} from "./forms/DropdownOption";

export { default as Input } from "./forms/Input";
export type { InputProps } from "./forms/Input";

export { default as TextArea } from "./forms/TextArea";
export type { TextAreaProps } from "./forms/TextArea";

export { default as Select } from "./forms/Select";
export type { SelectProps, SelectOption } from "./forms/Select";

export { default as Checkbox } from "./forms/Checkbox";
export type { CheckboxProps } from "./forms/Checkbox";

export { default as FormField } from "./forms/FormField";
export type { FormFieldProps } from "./forms/FormField";

// Modals
export { default as Modal } from "./modals/Modal";
export type { ModalProps } from "./modals/Modal";

export { default as ModalHeader } from "./modals/ModalHeader";
export type { ModalHeaderProps } from "./modals/ModalHeader";

export { default as ModalBody } from "./modals/ModalBody";
export type { ModalBodyProps } from "./modals/ModalBody";

export { default as ModalFooter } from "./modals/ModalFooter";
export type { ModalFooterProps } from "./modals/ModalFooter";

export { default as ConfirmDialog } from "./modals/ConfirmDialog";
export type { ConfirmDialogProps } from "./modals/ConfirmDialog";

export { default as TutorialModal } from "./modals/TutorialModal";
export type { TutorialModalProps, TutorialStep } from "./modals/TutorialModal";

// Animations
export {
  fadeIn,
  scaleIn,
  slideIn,
  slideUp,
  slideDown,
  expandCollapse,
  modalVariant,
  backdropVariant
} from "./animations";

// Existing common components
export { default as HelpIcon } from "./HelpIcon";
export { default as ModalPortal } from "./ModalPortal";
