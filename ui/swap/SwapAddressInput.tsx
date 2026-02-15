"use client";

import FormField from "@/ui/common/forms/FormField";

interface SwapAddressInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  showProfileButton?: boolean;
  helpText?: string;
  disabled?: boolean;
}

export default function SwapAddressInput({
  label,
  value,
  onChange,
  placeholder,
  helpText,
  disabled = false,
}: SwapAddressInputProps) {
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
          placeholder={placeholder}
          disabled={disabled}
          className={`
            flex-1 px-2 py-1.5 rounded-lg
            border border-gray-300
            text-sm text-gray-900 placeholder-gray-500
            focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
            transition-colors
            ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : ""}
          `}
          style={!disabled ? { backgroundColor: "var(--color-background)" } : {}}
        />
      </div>
    </FormField>
  );
}
