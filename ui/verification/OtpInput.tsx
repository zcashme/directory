"use client";

import { useRef } from "react";
import type React from "react";

/**
 * OTP Input Component Props
 */
interface OtpInputProps {
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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

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
    if (e.key === "Enter" && onSubmit && value.trim().length === 6) {
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
      <div
        className="relative"
        onClick={() => {
          if (!disabled) inputRef.current?.focus();
        }}
      >
        <div className="grid grid-cols-6 gap-2">
          {digits.map((digit, idx) => {
            const isActive = !disabled && (idx === value.length || (value.length === 6 && idx === 5));
            return (
              <div
                key={`otp-slot-${idx}`}
                className={`h-12 rounded-lg border text-lg font-semibold leading-none flex items-center justify-center transition-colors ${
                  error
                    ? "border-red-400 bg-transparent text-red-600"
                    : isActive
                      ? "border-[var(--color-brand-blue)] bg-transparent text-[var(--color-brand-blue)]"
                      : "border-gray-800 bg-transparent text-gray-700"
                } ${disabled ? "border-black/20 bg-transparent text-gray-400" : ""}`}
                aria-hidden="true"
              >
                {digit}
              </div>
            );
          })}
        </div>

        <input
          ref={inputRef}
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
          className="absolute inset-0 h-full w-full opacity-0 cursor-text"
        />
      </div>
    </div>
  );
}
