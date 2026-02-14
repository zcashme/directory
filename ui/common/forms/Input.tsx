"use client";

import { useState, useEffect } from "react";
import type { InputHTMLAttributes } from "react";

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
  const [validationState, setValidationState] = useState<{
    valid: boolean;
    reason: string | null;
  }>({ valid: true, reason: null });

  useEffect(() => {
    if (!validate || !value) {
      setValidationState({ valid: true, reason: null });
      return;
    }
    const result = validate(value.trim());
    setValidationState({
      valid: result.valid,
      reason: result.reason || null,
    });
  }, [value, validate]);

  const hasError = error || (showValidation && !validationState.valid);
  const hasInfo = !hasError && validationState.valid && validationState.reason;
  const displayMessage = errorMessage || validationState.reason || infoMessage;

  const getBorderClass = () => {
    if (readOnly || disabled) {
      return "border-black/40 bg-gray-100 text-gray-500 cursor-not-allowed";
    }
    if (hasError) {
      return "border-red-400 focus:border-red-500";
    }
    if (hasInfo) {
      return "border-blue-400 focus:border-blue-500";
    }
    return "border-black/30 focus:border-blue-600";
  };

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

      {/* Error message */}
      {showValidation && hasError && displayMessage && (
        <p
          id={`${props.id}-message`}
          className="text-xs text-red-600 mt-1"
          role="alert"
        >
          {displayMessage}
        </p>
      )}

      {/* Info message */}
      {showValidation && hasInfo && displayMessage && (
        <p
          id={`${props.id}-message`}
          className="text-xs text-blue-600 mt-1"
        >
          {displayMessage}
        </p>
      )}

      {/* Static info message */}
      {!hasError && !hasInfo && infoMessage && (
        <p
          id={`${props.id}-message`}
          className="text-xs text-gray-500 mt-1"
        >
          {infoMessage}
        </p>
      )}
    </div>
  );
}
