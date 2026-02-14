/**
 * Form Components
 *
 * Reusable form components including dropdowns, inputs, and other
 * interactive form elements.
 *
 * @example
 * ```tsx
 * import { Dropdown, Input, FormField } from '@/ui/common/forms'
 *
 * function MyForm() {
 *   return (
 *     <FormField
 *       label="Email"
 *       htmlFor="email"
 *       helpText="Enter your email address"
 *     >
 *       <Input
 *         id="email"
 *         type="email"
 *         value={email}
 *         onChange={setEmail}
 *       />
 *     </FormField>
 *   )
 * }
 * ```
 */

// Dropdown components (existing)
export { default as Dropdown } from "./Dropdown";
export type { DropdownProps } from "./Dropdown";

export { default as DropdownOptionComponent } from "./DropdownOption";
export type {
  DropdownOption,
  DropdownOptionComponentProps,
} from "./DropdownOption";

// Input components (Phase 2.1)
export { default as Input } from "./Input";
export type { InputProps } from "./Input";

export { default as TextArea } from "./TextArea";
export type { TextAreaProps } from "./TextArea";

export { default as Select } from "./Select";
export type { SelectProps, SelectOption } from "./Select";

export { default as Checkbox } from "./Checkbox";
export type { CheckboxProps } from "./Checkbox";

export { default as FormField } from "./FormField";
export type { FormFieldProps } from "./FormField";
