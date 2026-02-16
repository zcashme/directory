"use client";

import type { InputHTMLAttributes } from "react";
import { useFieldValidation } from "./useFieldValidation";
import FieldMessages from "./FieldMessages";

/**
 * Base text input component with validation states and sizing options.
 *
 * @example
 * ```tsx
 * <Input
 *   value={email}
 *   onChange={setEmail}
 *   type="email"
 *   placeholder="Enter your email"
 * />
 * ```
 *
 * @example
 * ```tsx
 * <Input
 *   value={url}
 *   onChange={setUrl}
 *   type="url"
 *   error={!isValid}
 *   errorMessage="Invalid URL"
 *   showValidation
 * />
 * ```
 *
 * @example
 * ```tsx
 * <Input
 *   value={name}
 *   onChange={setName}
 *   size="lg"
 *   validate={(val) => ({ valid: val.length > 0, reason: val.length === 0 ? "Required" : null })}
 *   showValidation
 * />
 * ```
 */
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "size"> {
  /** Current input value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Input type */
  type?: "text" | "email" | "url" | "number" | "tel" | "password" | "search";
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
  /** Input size */
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
 * Input - Base text input component.
 *
 * Features:
 * - Multiple input types (text, email, url, number, tel, password, search)
 * - Configurable sizes (sm, md, lg)
 * - Built-in validation support with custom validation functions
 * - Error and info message display
 * - Border states: normal, error, info, readonly
 * - Focus states and smooth transitions
 * - Accessible with proper ARIA attributes
 */
export default function Input({
  value,
  onChange,
  type = "text",
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
}: InputProps) {
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
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        disabled={disabled}
        className={`
          w-full rounded-2xl border bg-transparent outline-hidden
          font-mono text-gray-800 placeholder-gray-400
          transition-colors duration-200
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
