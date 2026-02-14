"use client";

import { useState, useEffect } from "react";
import type { TextareaHTMLAttributes } from "react";

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
export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "size"> {
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
