"use client";

import type React from "react";

/**
 * OTP Input Component Props
 */
export interface OtpInputProps {
  /** Controlled value (digits only) */
  value: string;

  /** Change handler - receives digit-only string */
  onChange: (value: string) => void;

  /** Optional submit handler (called on Enter key) */
  onSubmit?: () => void;

  /** Show error styling */
  error?: boolean;

  /** Disable input */
  disabled?: boolean;

  /** Custom placeholder text */
  placeholder?: string;

  /** Custom input ID for label association */
  id?: string;

  /** Custom label text */
  label?: string;

  /** Hide label visually (but keep for accessibility) */
  hideLabel?: boolean;

  /** Auto-focus on mount */
  autoFocus?: boolean;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Reusable OTP Input Component
 *
 * Features:
 * - Auto-strips non-digit characters
 * - 6-digit max length
 * - Mobile-optimized numeric keyboard
 * - Enter key submission
 * - Accessibility attributes
 * - Error state styling
 *
 * @example
 * ```tsx
 * <OtpInput
 *   value={otp}
 *   onChange={setOtp}
 *   onSubmit={handleSubmit}
 *   error={hasError}
 *   autoFocus
 * />
 * ```
 */
export function OtpInput({
  value,
  onChange,
  onSubmit,
  error = false,
  disabled = false,
  placeholder = "Paste your OTP",
  id = "otp-input",
  label = "One-time passcode (OTP)",
  hideLabel = false,
  autoFocus = false,
  className = "",
}: OtpInputProps) {
  /**
   * Handle input change - strip non-digits automatically
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyDigits = e.target.value.replace(/\D+/g, "");
    onChange(onlyDigits);
  };

  /**
   * Handle Enter key press for submission
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSubmit && value.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={`block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1 ${
          hideLabel ? "sr-only" : ""
        }`}
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        maxLength={6}
        inputMode="numeric"
        autoComplete="one-time-code"
        className={`w-full rounded-xl border px-3 py-2 text-sm outline-hidden
          ${error ? "border-red-400" : "border-black/30"}
          ${disabled ? "bg-gray-50 cursor-not-allowed" : "bg-white"}
          focus:border-[var(--color-brand-blue)]`}
      />
    </div>
  );
}
