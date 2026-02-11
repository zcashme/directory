"use client";

import CurrencySelector, { type Currency } from "./CurrencySelector";
import type { Token } from "@/lib/swap/types";

interface SwapAmountInputProps {
  label: string;
  currency: Currency;
  amount: string;
  usdValue: string;
  onCurrencyChange: (currency: Currency) => void;
  onAmountChange: (amount: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  availableTokens?: Token[];
}

export default function SwapAmountInput({
  label,
  currency,
  amount,
  usdValue,
  onCurrencyChange,
  onAmountChange,
  disabled = false,
  readOnly = false,
  availableTokens = [],
}: SwapAmountInputProps) {
  const handleAmountChange = (value: string) => {
    // Allow only numbers and one decimal point
    const regex = /^\d*\.?\d*$/;
    if (regex.test(value) || value === "") {
      onAmountChange(value);
    }
  };

  return (
    <div className="space-y-2 border-2 border-pink-500">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="flex items-center gap-2 px-3 py-2.5 border-2 border-rose-500 rounded-full" style={{ backgroundColor: 'var(--color-background)' }}>
        <CurrencySelector
          selectedCurrency={currency}
          onSelect={onCurrencyChange}
          disabled={disabled}
          availableTokens={availableTokens}
        />
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          placeholder="0.00"
          disabled={disabled}
          readOnly={readOnly}
          className={`
            w-20 text-lg font-semibold text-gray-700
            bg-transparent outline-none
            placeholder-gray-400
            ${disabled || readOnly ? "cursor-not-allowed opacity-50" : ""}
          `}
        />
        <div className="text-base text-gray-500 font-medium whitespace-nowrap ml-auto">
          ${usdValue || "0.00"}
        </div>
      </div>
    </div>
  );
}
