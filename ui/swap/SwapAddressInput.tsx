"use client";

import { FormField } from "@/ui/common";

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
  showProfileButton = false,
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
            flex-1 px-4 py-3 rounded-xl
            border border-gray-300 bg-white
            text-sm text-gray-800 placeholder-gray-400
            focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
            transition-colors
            ${disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : ""}
          `}
        />
        {showProfileButton && (
          <button
            type="button"
            className="p-3 rounded-xl bg-gray-600 hover:bg-gray-700 text-white transition-colors"
            title="Select from profile"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="p-3 rounded-xl bg-gray-600 hover:bg-gray-700 text-white transition-colors"
          title="Scan QR code"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
        </button>
      </div>
    </FormField>
  );
}
