"use client";

import { useState } from "react";
import { TokenIcon } from "./SwapCurrencyPair";
import type { Token } from "@/lib/swap/types";

export interface Currency {
  symbol: string;
  name: string;
  network?: string;
}

function tokenToCurrency(token: Token): Currency {
  return {
    symbol: token.symbol,
    name: token.symbol,
    network: token.blockchain,
  };
}

interface CurrencySelectorProps {
  selectedCurrency: Currency;
  onSelect: (currency: Currency) => void;
  disabled?: boolean;
  availableTokens?: Token[];
}

export default function CurrencySelector({
  selectedCurrency,
  onSelect,
  disabled = false,
  availableTokens = [],
}: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Convert tokens to currencies for display
  const currencies = availableTokens.map(tokenToCurrency);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-full
          border border-gray-200 bg-gray-50
          hover:bg-gray-100 transition-colors
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        <TokenIcon symbol={selectedCurrency.symbol} size={24} />
        <div className="flex flex-col items-start">
          <span className="font-semibold text-gray-700">
            {selectedCurrency.symbol}
          </span>
          {selectedCurrency.network && (
            <span className="text-xs text-gray-500">{selectedCurrency.network}</span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl border border-gray-300 shadow-xl z-20 overflow-hidden">
            <div className="p-3 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search currencies..."
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="max-h-80 overflow-y-auto">
              {currencies.map((currency) => {
                const key = `${currency.symbol}-${currency.network}`;
                const isSelected = selectedCurrency.symbol === currency.symbol && selectedCurrency.network === currency.network;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onSelect(currency);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3
                      hover:bg-gray-50 transition-colors
                      ${isSelected ? "bg-blue-50" : ""}
                    `}
                  >
                    <TokenIcon symbol={currency.symbol} size={32} />
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-700">
                        {currency.symbol}
                      </div>
                      <div className="text-xs text-gray-500">{currency.network}</div>
                    </div>
                    {isSelected && (
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
