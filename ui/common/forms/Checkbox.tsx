"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

/**
 * Checkbox component with label and flexible positioning.
 *
 * @example
 * ```tsx
 * <Checkbox
 *   checked={agreed}
 *   onChange={setAgreed}
 *   label="I agree to the terms and conditions"
 * />
 * ```
 *
 * @example
 * ```tsx
 * <Checkbox
 *   checked={enabled}
 *   onChange={setEnabled}
 *   label="Enable notifications"
 *   labelPosition="left"
 *   size="lg"
 * />
 * ```
 *
 * @example
 * ```tsx
 * <Checkbox
 *   checked={subscribe}
 *   onChange={setSubscribe}
 *   label={
 *     <span>
 *       Subscribe to <strong>newsletter</strong>
 *     </span>
 *   }
 *   infoMessage="You can unsubscribe at any time"
 * />
 * ```
 */
export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "size"> {
  /** Whether checkbox is checked */
  checked: boolean;
  /** Callback when checked state changes */
  onChange: (checked: boolean) => void;
  /** Label text or element */
  label?: string | ReactNode;
  /** Label position relative to checkbox */
  labelPosition?: "left" | "right";
  /** Error state */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Info message to display */
  infoMessage?: string;
  /** Checkbox size */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes for container */
  className?: string;
  /** Additional CSS classes for checkbox input */
  inputClassName?: string;
  /** Additional CSS classes for label */
  labelClassName?: string;
}

const SIZE_CLASSES = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

const LABEL_SIZE_CLASSES = {
  sm: "text-sm",
  md: "text-sm",
  lg: "text-base",
};

/**
 * Checkbox - Checkbox input with label component.
 *
 * Features:
 * - Flexible label positioning (left or right)
 * - Support for string or ReactNode labels
 * - Configurable sizes (sm, md, lg)
 * - Error and info message display
 * - Custom styling with Tailwind classes
 * - Focus states with visible outline
 * - Accessible with proper ARIA attributes
 * - Native checkbox behavior
 */
export default function Checkbox({
  checked,
  onChange,
  label,
  labelPosition = "right",
  error = false,
  errorMessage,
  infoMessage,
  size = "md",
  className = "",
  inputClassName = "",
  labelClassName = "",
  disabled = false,
  id,
  ...props
}: CheckboxProps) {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = error;
  const displayMessage = errorMessage || infoMessage;

  const checkboxElement = (
    <input
      type="checkbox"
      id={checkboxId}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className={`
        rounded border-2 transition-colors duration-200
        ${SIZE_CLASSES[size]}
        ${
          disabled
            ? "border-gray-300 bg-gray-100 cursor-not-allowed"
            : hasError
            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
            : "border-black/30 focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
        }
        ${checked && !disabled ? "bg-blue-600 border-blue-600" : "bg-transparent"}
        ${inputClassName}
      `.trim().replace(/\s+/g, " ")}
      aria-invalid={hasError}
      aria-describedby={displayMessage ? `${checkboxId}-message` : undefined}
      {...props}
    />
  );

  const labelElement = label && (
    <label
      htmlFor={checkboxId}
      className={`
        ${LABEL_SIZE_CLASSES[size]}
        ${disabled ? "text-gray-500 cursor-not-allowed" : "text-gray-700 cursor-pointer"}
        select-none
        ${labelClassName}
      `.trim().replace(/\s+/g, " ")}
    >
      {label}
    </label>
  );

  return (
    <div className="w-full">
      <div
        className={`
          flex items-center gap-2
          ${labelPosition === "left" ? "flex-row-reverse justify-end" : ""}
          ${className}
        `.trim().replace(/\s+/g, " ")}
      >
        {checkboxElement}
        {labelElement}
      </div>

      {/* Error message */}
      {hasError && errorMessage && (
        <p
          id={`${checkboxId}-message`}
          className="text-xs text-red-600 mt-1"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      {/* Info message */}
      {!hasError && infoMessage && (
        <p
          id={`${checkboxId}-message`}
          className="text-xs text-gray-500 mt-1"
        >
          {infoMessage}
        </p>
      )}
    </div>
  );
}
