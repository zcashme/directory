"use client";

import type { TextareaHTMLAttributes } from "react";
import { useFieldValidation } from "./useFieldValidation";
import FieldMessages from "./FieldMessages";

/**
 * Multi-line text input component with validation states and sizing options.
 *
 * @example
 * ```tsx
 * <TextArea
 *   value={bio}
 *   onChange={setBio}
 *   placeholder="Tell us about yourself"
 *   rows={4}
 * />
 * ```
 *
 * @example
 * ```tsx
 * <TextArea
 *   value={description}
 *   onChange={setDescription}
 *   error={description.length > 500}
 *   errorMessage="Description must be 500 characters or less"
 *   showValidation
 * />
 * ```
 *
 * @example
 * ```tsx
 * <TextArea
 *   value={message}
 *   onChange={setMessage}
 *   size="lg"
 *   rows={6}
 *   validate={(val) => ({
 *     valid: val.length >= 10,
 *     reason: val.length < 10 ? "Minimum 10 characters required" : null
 *   })}
 *   showValidation
 * />
 * ```
 */
interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "size"> {
  /** Current textarea value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Number of visible text rows */
  rows?: number;
  /** Error state (overrides validation) */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Info message to display */
  infoMessage?: string;
  /** Custom validation function */
  validate?: (value: string) => { valid: boolean; reason?: string | null };
  /** Whether to show validation messages */
  showValidation?: boolean;
  /** Textarea size */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

const SIZE_CLASSES = {
  sm: "text-sm px-3 py-1.5",
  md: "text-sm px-3 py-2",
  lg: "text-base px-4 py-2.5",
};

/**
 * TextArea - Multi-line text input component.
 *
 * Features:
 * - Configurable number of rows
 * - Multiple sizes (sm, md, lg)
 * - Built-in validation support with custom validation functions
 * - Error and info message display
 * - Border states: normal, error, info, readonly
 * - Focus states and smooth transitions
 * - Accessible with proper ARIA attributes
 * - Auto-resizes based on row count
 */
export default function TextArea({
  value,
  onChange,
  rows = 3,
  error = false,
  errorMessage,
  infoMessage,
  validate,
  showValidation = false,
  size = "md",
  className = "",
  readOnly = false,
  disabled = false,
  ...props
}: TextAreaProps) {
  const { hasError, hasInfo, displayMessage, getBorderClass } = useFieldValidation({
    value,
    error,
    errorMessage,
    infoMessage,
    validate,
    showValidation,
    readOnly,
    disabled,
  });

  return (
    <div className="w-full">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        readOnly={readOnly}
        disabled={disabled}
        className={`
          w-full rounded-2xl border bg-transparent outline-hidden
          font-mono text-gray-800 placeholder-gray-400
          transition-colors duration-200
          resize-y
          ${SIZE_CLASSES[size]}
          ${getBorderClass()}
          ${className}
        `.trim().replace(/\s+/g, " ")}
        aria-invalid={hasError}
        aria-describedby={displayMessage ? `${props.id}-message` : undefined}
        {...props}
      />

      <FieldMessages
        id={props.id}
        showValidation={showValidation}
        hasError={hasError}
        hasInfo={hasInfo}
        displayMessage={displayMessage}
        infoMessage={infoMessage}
      />
    </div>
  );
}
