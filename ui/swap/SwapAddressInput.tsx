"use client";

import FormField from "@/ui/common/forms/FormField";

interface SwapAddressInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  showProfileButton?: boolean;
  helpText?: string;
  disabled?: boolean;
  validationMessage?: string;
  validationState?: "valid" | "invalid" | "warning" | "none";
  showValidation?: boolean;
}

export default function SwapAddressInput({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  helpText,
  disabled = false,
  validationMessage = "",
  validationState = "none",
  showValidation = false,
}: SwapAddressInputProps) {
  const showValidationMessage = showValidation && !!validationMessage;
  const validationClasses = showValidationMessage
    ? validationState === "invalid"
      ? "border-red-400 focus:border-red-500 focus:ring-red-500"
      : validationState === "warning"
        ? "border-amber-400 focus:border-amber-500 focus:ring-amber-500"
      : validationState === "valid"
        ? "border-green-400 focus:border-green-500 focus:ring-green-500"
        : "border-gray-300 focus:border-[var(--color-brand-blue)] focus:ring-[var(--color-brand-blue)]"
    : "border-gray-300 focus:border-[var(--color-brand-blue)] focus:ring-[var(--color-brand-blue)]";

  return (
    <FormField
      label={label}
      helpText={helpText}
      className="space-y-2"
      labelClassName="text-sm"
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            flex-1 px-2 py-1.5 rounded-lg
            border ${validationClasses}
            text-sm text-gray-900 placeholder-gray-500
            focus:outline-none focus:ring-1
            transition-colors
            ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : ""}
          `}
          style={!disabled ? { backgroundColor: "var(--color-background)" } : {}}
        />
      </div>
      {showValidationMessage && (
        <p
          className={`text-xs ${
            validationState === "valid"
              ? "text-green-600"
              : validationState === "warning"
                ? "text-amber-700"
                : "text-red-600"
          }`}
        >
          {validationMessage}
        </p>
      )}
    </FormField>
  );
}
