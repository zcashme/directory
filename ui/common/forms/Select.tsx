"use client";

import type { SelectHTMLAttributes } from "react";

/**
 * Native select dropdown component with consistent styling.
 *
 * @example
 * ```tsx
 * <Select
 *   value={country}
 *   onChange={setCountry}
 *   options={[
 *     { value: "", label: "Select a country" },
 *     { value: "us", label: "United States" },
 *     { value: "ca", label: "Canada" }
 *   ]}
 * />
 * ```
 *
 * @example
 * ```tsx
 * <Select
 *   value={priority}
 *   onChange={setPriority}
 *   size="lg"
 *   error={!priority}
 *   errorMessage="Please select a priority"
 *   showValidation
 * >
 *   <option value="">Select priority</option>
 *   <option value="low">Low</option>
 *   <option value="medium">Medium</option>
 *   <option value="high">High</option>
 * </Select>
 * ```
 */
export interface SelectOption {
  /** Option value */
  value: string;
  /** Option display label */
  label: string;
  /** Whether option is disabled */
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "size"> {
  /** Current selected value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Select options (alternative to children) */
  options?: SelectOption[];
  /** Error state */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Info message to display */
  infoMessage?: string;
  /** Whether to show validation messages */
  showValidation?: boolean;
  /** Select size */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

const SIZE_CLASSES = {
  sm: "text-sm px-3 py-1.5 pr-8",
  md: "text-sm px-3 py-2 pr-8",
  lg: "text-base px-4 py-2.5 pr-10",
};

/**
 * Select - Native select dropdown component.
 *
 * Features:
 * - Native HTML select for best accessibility and mobile UX
 * - Support for both options prop and children
 * - Configurable sizes (sm, md, lg)
 * - Error and info message display
 * - Border states: normal, error, readonly
 * - Focus states and smooth transitions
 * - Accessible with proper ARIA attributes
 * - Custom styled dropdown arrow
 */
export default function Select({
  value,
  onChange,
  options,
  error = false,
  errorMessage,
  infoMessage,
  showValidation = false,
  size = "md",
  className = "",
  disabled = false,
  children,
  ...props
}: SelectProps) {
  const hasError = error;
  const displayMessage = errorMessage || infoMessage;

  const getBorderClass = () => {
    if (disabled) {
      return "border-black/40 bg-gray-100 text-gray-500 cursor-not-allowed";
    }
    if (hasError) {
      return "border-red-400 focus:border-red-500";
    }
    return "border-black/30 focus:border-[var(--color-brand-blue)]";
  };

  return (
    <div className="w-full">
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            w-full rounded-2xl border bg-transparent outline-hidden
            appearance-none
            font-mono text-gray-800
            transition-colors duration-200
            ${SIZE_CLASSES[size]}
            ${getBorderClass()}
            ${className}
          `.trim().replace(/\s+/g, " ")}
          aria-invalid={hasError}
          aria-describedby={displayMessage ? `${props.id}-message` : undefined}
          {...props}
        >
          {options
            ? options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))
            : children}
        </select>

        {/* Custom dropdown arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
          <svg
            width="12"
            height="8"
            viewBox="0 0 12 8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 1.5L6 6.5L11 1.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Error message */}
      {showValidation && hasError && errorMessage && (
        <p
          id={`${props.id}-message`}
          className="text-xs text-red-600 mt-1"
          role="alert"
        >
          {errorMessage}
        </p>
      )}

      {/* Info message */}
      {!hasError && infoMessage && (
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
