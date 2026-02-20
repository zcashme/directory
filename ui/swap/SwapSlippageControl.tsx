"use client";
import { useState } from "react";

interface SwapSlippageControlProps {
  value: string;
  onChange: (value: string) => void;
  variant?: "collapsible" | "inline";
  presets?: string[];
}

export default function SwapSlippageControl({
  value,
  onChange,
  variant = "collapsible",
  presets = ["0.1", "0.5", "1", "2", "5"],
}: SwapSlippageControlProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (newValue: string) => {
    const numValue = parseFloat(newValue);
    if (numValue >= 0 && numValue <= 100) {
      onChange(newValue);
    }
  };

  const handleInputChange = (inputValue: string) => {
    if (inputValue === "") {
      onChange("0.5");
      return;
    }
    if (!/^\d*\.?\d*$/.test(inputValue)) return;
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      onChange(inputValue);
    }
  };

  const handleBlur = (inputValue: string) => {
    const trimmed = inputValue.trim();
    if (!trimmed || isNaN(parseFloat(trimmed))) {
      onChange("0.5");
    }
  };

  if (variant === "inline") {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-gray-600">Slippage tolerance</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={(e) => handleBlur(e.target.value)}
          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg text-center focus:outline-none focus:border-[var(--color-brand-blue)]"
        />
        <span className="text-sm text-gray-600">%</span>
        <button
          type="button"
          className="p-1.5 text-gray-400 hover:text-gray-600"
          title="Adjust slippage settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    );
  }

  // Collapsible variant
  return (
    <div className="bg-transparent rounded-xl">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-center rounded-xl cursor-pointer"
      >
        <span className="text-sm text-gray-800">
          Slippage Tolerance ({value}%)
        </span>
        <span
          className={`text-gray-600 transform transition ml-2 ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {/* Slippage Controls (Collapsible Content) */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          <div className="flex items-center gap-2 flex-wrap">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleChange(preset)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${
                  value === preset
                    ? "bg-white border-gray-800 text-gray-900"
                    : "bg-transparent border-gray-300 text-gray-600 hover:border-gray-500"
                }`}
              >
                {preset}%
              </button>
            ))}
            <div className="flex items-center gap-1 ml-auto">
              <input
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={(e) => handleBlur(e.target.value)}
                placeholder="0.5"
                className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-blue)]"
              />
              <span className="text-sm text-gray-600">%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
