"use client";

import CurrencySelector, { type Currency } from "./CurrencySelector";

interface SwapAmountInputProps {
  label: string;
  currency: Currency;
  amount: string;
  usdValue: string;
  onCurrencyChange: (currency: Currency) => void;
  onAmountChange: (amount: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
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
}: SwapAmountInputProps) {
  const handleAmountChange = (value: string) => {
    // Allow only numbers and one decimal point
    const regex = /^\d*\.?\d*$/;
    if (regex.test(value) || value === "") {
      onAmountChange(value);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-base font-semibold text-gray-700">{label}</label>
      <div className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-full" style={{ backgroundColor: 'var(--color-background)' }}>
        <CurrencySelector
          selectedCurrency={currency}
          onSelect={onCurrencyChange}
          disabled={disabled}
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
            flex-1 text-2xl font-semibold text-gray-700
            bg-transparent outline-none
            placeholder-gray-400
            ${disabled || readOnly ? "cursor-not-allowed opacity-50" : ""}
          `}
        />
        <div className="text-xl text-gray-500 font-medium">
          ${usdValue || "0.00"}
        </div>
      </div>
    </div>
  );
}
