import type { ReactNode } from "react";
import HelpIcon from "@/ui/common/HelpIcon";

/**
 * Form field wrapper component providing consistent layout with label, help text, and error display.
 *
 * @example
 * ```tsx
 * <FormField
 *   label="Email Address"
 *   htmlFor="email"
 *   helpText="We'll never share your email"
 *   required
 * >
 *   <Input
 *     id="email"
 *     value={email}
 *     onChange={setEmail}
 *     type="email"
 *   />
 * </FormField>
 * ```
 *
 * @example
 * ```tsx
 * <FormField
 *   label="Username"
 *   htmlFor="username"
 *   helpText="Choose a unique username"
 *   error="Username already taken"
 *   hint="Available"
 *   actions={<button>Check availability</button>}
 * >
 *   <Input
 *     id="username"
 *     value={username}
 *     onChange={setUsername}
 *   />
 * </FormField>
 * ```
 *
 * @example
 * ```tsx
 * <FormField
 *   label="Profile Settings"
 *   helpText="Manage your profile visibility"
 *   infoMessage="Changes will be saved automatically"
 * >
 *   <Checkbox
 *     checked={isPublic}
 *     onChange={setIsPublic}
 *     label="Make profile public"
 *   />
 * </FormField>
 * ```
 */
interface FormFieldProps {
  /** Field label text */
  label: string;
  /** HTML for attribute to associate label with input */
  htmlFor?: string;
  /** Help text explaining the field (shown with help icon) */
  helpText?: string;
  /** Error message to display */
  error?: string;
  /** Hint or status text (e.g., "Available", "Verified") */
  hint?: string;
  /** Info-level message */
  infoMessage?: string;
  /** Whether field is required */
  required?: boolean;
  /** Action elements (buttons, links) to display in header */
  actions?: ReactNode;
  /** Form input or other content */
  children: ReactNode;
  /** Additional CSS classes for container */
  className?: string;
  /** Additional CSS classes for label */
  labelClassName?: string;
}

/**
 * FormField - Wrapper component for form inputs.
 *
 * Features:
 * - Consistent label and layout styling
 * - Optional help text with icon
 * - Required field indicator
 * - Error message display
 * - Hint/status text support
 * - Info message support
 * - Action buttons in header
 * - Flexible content area for any form input
 * - Accessible with proper label associations
 */
export default function FormField({
  label,
  htmlFor,
  helpText,
  error,
  hint,
  infoMessage,
  required = false,
  actions,
  children,
  className = "",
  labelClassName = "",
}: FormFieldProps) {
  return (
    <div className={`mb-4 ${className}`.trim()}>
      {/* Header with label, help icon, and actions */}
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label
            htmlFor={htmlFor}
            className={`font-semibold text-gray-700 ${labelClassName}`.trim()}
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
          {helpText && <HelpIcon text={helpText} />}
          {hint && (
            <span className="text-xs text-gray-500 italic">
              {hint}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {actions}
        </div>
      </div>

      {/* Input content */}
      {children}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}

      {/* Info message */}
      {!error && infoMessage && (
        <p className="text-xs text-[var(--color-brand-blue)] mt-1">
          {infoMessage}
        </p>
      )}
    </div>
  );
}
