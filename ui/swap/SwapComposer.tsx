"use client";
import { useState } from "react";
import type { Profile } from "@/lib/profile/types";
import type {
  SwapConfirmResponse,
  SwapConfirmSuccess,
  SwapContextQuoteData,
  SwapQuoteDisplay,
  SwapQuoteResponse,
  Token,
} from "@/lib/swap/types";

const isConfirmSuccess = (data: SwapContextQuoteData | null): data is SwapConfirmSuccess =>
  Boolean(data && data.ok === true && "deposit" in data);
import AmountAndWallet from "@/ui/verification/AmountAndWallet";
import SwapDepositDisplay from "@/ui/swap/SwapDepositDisplay";
import { getTokenId } from "@/lib/swap/utils";

interface SwapComposerProps {
  profile: Profile;
  // Token state
  tokenOptions: Token[];
  originSymbol: string;
  // Swap input state
  swapAmount: string;
  refundAddress: string;
  slippageTolerance: string;
  // Quote output state
  quotePreview: SwapQuoteDisplay | null;
  quoteData: SwapContextQuoteData;
  // Swap output state
  depositUri: string;
  statusKey: { depositAddress: string } | null;
  // UI state
  isGettingQuote: boolean;
  isConfirming: boolean;
  quoteStatus: string;
  swapError: string;
  // Actions
  setToken: (_tokenId: string) => void;
  setSwapAmount: (_amount: string) => void;
  setRefundAddress: (_address: string) => void;
  setSlippageTolerance: (_slippage: string) => void;
  getQuote: (_params: {
    amountIn: string;
    destAddress: string;
    fromToken?: string;
    toToken?: string;
    refund?: string;
    slippage?: string;
  }) => Promise<SwapQuoteResponse | null>;
  confirmSwap: (_params: {
    amountIn: string;
    destAddress: string;
    fromToken?: string;
    toToken?: string;
    refund?: string;
    slippage?: string;
  }) => Promise<SwapConfirmResponse | null>;
  resetSwapState: () => void;
}

export default function SwapComposer({
  profile,
  // Token state
  tokenOptions,
  originSymbol,
  // Swap input state
  swapAmount,
  refundAddress,
  slippageTolerance,
  // Quote output state
  quotePreview,
  quoteData,
  // Swap output state
  depositUri,
  statusKey,
  // UI state
  isGettingQuote,
  isConfirming,
  quoteStatus,
  swapError,
  // Actions
  setToken,
  setSwapAmount,
  setRefundAddress,
  setSlippageTolerance,
  getQuote,
  confirmSwap,
  resetSwapState,
}: SwapComposerProps) {

  const recipientName = profile?.display_name ?? profile?.name ?? "Recipient";
  const confirmedQuote = isConfirmSuccess(quoteData) ? quoteData : null;
  const depositAmountDecimal = confirmedQuote?.deposit?.amountDecimal ?? "";

  // Validation checks
  const canGetQuote = !isGettingQuote && swapAmount && refundAddress && parseFloat(swapAmount) > 0;
  const canConfirmQuote = !isConfirming && quotePreview;

  // Format tokens for selector
  const formattedTokenOptions = tokenOptions.map((token) => ({
    id: getTokenId(token) ?? "",
    symbol: token.symbol,
    chain: token.blockchain,
    logo: token.logo ?? "",
  }));

  // Handlers
  const handleTokenChange = (tokenId: string) => {
    setToken(tokenId);
  };

  const handleGetQuote = async () => {
    await getQuote({
      amountIn: swapAmount,
      destAddress: profile?.address || "",
      refund: refundAddress,
      slippage: slippageTolerance,
    });
  };

  const handleConfirmQuote = async () => {
    await confirmSwap({
      amountIn: swapAmount,
      destAddress: profile?.address || "",
      refund: refundAddress,
      slippage: slippageTolerance,
    });
  };

  const handleSlippageChange = (value: string) => {
    const numValue = parseFloat(value);
    if (numValue >= 0 && numValue <= 100) {
      setSlippageTolerance(value);
    }
  };

  const slippageOptions = ["0.1", "0.5", "1", "2", "5"];

  const [isSlippageExpanded, setIsSlippageExpanded] = useState(false);

  return (
    <div className="bg-transparent border-none shadow-none p-0 -mt-4 relative z-10">
      {/* HEADER: Back + Recipient */}
      <div className="flex justify-between items-start relative mb-3">
        <div className="text-md font-semibold text-gray-800 whitespace-normal">
          Send to{" "}
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            {recipientName}
          </span>
        </div>

        <button
          type="button"
          onClick={resetSwapState}
          className="text-gray-600 hover:text-gray-800 text-sm flex-shrink-0"
          aria-label="Go back to ZEC payment"
        >
          ← ZEC
        </button>
      </div>

      {/* DISABLED MEMO FIELD */}
      <div className="relative mb-2">
        <textarea
          rows={3}
          disabled
          placeholder="Message is available only when sending ZEC"
          className="border border-gray-800 px-3 py-2 rounded-xl w-full text-md resize-none pr-7 bg-gray-100 text-gray-400 cursor-not-allowed"
        />

        <button
          type="button"
          disabled
          className="absolute right-3 top-1 text-gray-300 cursor-not-allowed"
          aria-label="Clear message (disabled)"
        >
          ⌫
        </button>

        <span className="absolute bottom-3 right-3 text-md text-gray-400">
          512 bytes left
        </span>
      </div>

      {/* AMOUNT INPUT + TOKEN SELECTOR + USD DISPLAY */}
      <AmountAndWallet
        amount={swapAmount}
        setAmount={setSwapAmount}
        openWallet={undefined}
        showOpenWallet={false}
        showUsdPill={true}
        asset={originSymbol}
        assetOptions={formattedTokenOptions}
        setAsset={handleTokenChange}
        showRefund={true}
        refundAddress={refundAddress}
        setRefundAddress={setRefundAddress}
      />

      {/* QUOTE PREVIEW DISPLAY (After "Get quote" succeeds) */}
      {quotePreview && (
        <div className="mt-3 p-4 rounded-xl border border-gray-800" style={{ backgroundColor: '#faf6ed' }}>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">You send</span>
              <span className="text-md font-semibold text-gray-900">
                {quotePreview.amountInFormatted} {quotePreview.fromSymbol}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{recipientName} receives</span>
              <span className="text-md font-semibold text-gray-900">
                {quotePreview.amountOutFormatted} {quotePreview.toSymbol}
              </span>
            </div>
            {quotePreview.amountOutUsd && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Value</span>
                <span className="text-sm text-gray-600">
                  ≈ ${parseFloat(quotePreview.amountOutUsd.toString()).toFixed(2)} USD
                </span>
              </div>
            )}
            {quotePreview.minAmountOut && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Minimum received</span>
                <span className="text-sm text-gray-600">
                  {quotePreview.minAmountOut} {quotePreview.toSymbol}
                </span>
              </div>
            )}
            {quotePreview.timeEstimate && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Estimated time</span>
                <span className="text-sm text-gray-600">{quotePreview.timeEstimate}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SWAP DEPOSIT DISPLAY */}
      <SwapDepositDisplay
        depositUri={depositUri}
        depositAddress={statusKey?.depositAddress}
        amountDecimal={depositAmountDecimal}
        originSymbol={originSymbol}
      />

      {/* STATUS MESSAGE (Before quote/polling) */}
      {quoteStatus && !quotePreview && !statusKey?.depositAddress && (
        <div className="mt-3 p-3 rounded-xl border border-gray-800 bg-white text-sm text-gray-700">
          {quoteStatus}
        </div>
      )}

      {/* ERROR MESSAGE */}
      {swapError && (
        <div className="mt-3 p-3 rounded-xl border border-gray-800 bg-white text-sm text-gray-700">
          {swapError}
        </div>
      )}

      {/* ACTION BUTTONS */}
      {!statusKey?.depositAddress && (
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => {
              void handleGetQuote();
            }}
            disabled={!canGetQuote}
            className={`flex-1 px-4 py-3 text-md font-medium border border-gray-800 rounded-xl transition-colors ${
              canGetQuote
                ? "bg-white text-gray-800 hover:bg-gray-50"
                : "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300"
            }`}
          >
            {isGettingQuote ? "Getting quote..." : "Get quote"}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirmQuote();
            }}
            disabled={!canConfirmQuote}
            className={`flex-1 px-4 py-3 text-md font-medium border border-gray-800 rounded-xl transition-colors ${
              canConfirmQuote
                ? "bg-white text-gray-800 hover:bg-gray-50"
                : "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300"
            }`}
          >
            {isConfirming ? "Confirming..." : "Confirm quote"}
          </button>
        </div>
      )}

      {/* SWAP SETTINGS (Hidden after confirmation) */}
      {!statusKey?.depositAddress && (
        <div className="mt-3 bg-transparent rounded-xl">
          {/* Collapsible Header */}
          <button
            type="button"
            onClick={() => setIsSlippageExpanded(!isSlippageExpanded)}
            className="w-full px-4 py-3 flex items-center justify-center rounded-xl cursor-pointer"
          >
            <span className="text-sm text-gray-800">
              Slippage Tolerance ({slippageTolerance}%)
            </span>
            <span className={`text-gray-600 transform transition ml-2 ${isSlippageExpanded ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {/* Slippage Controls (Collapsible Content) */}
          {isSlippageExpanded && (
            <div className="px-4 pb-4 pt-0">
              <div className="flex items-center gap-2 flex-wrap">
                {slippageOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSlippageChange(option)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${
                      slippageTolerance === option
                        ? "bg-white border-gray-800 text-gray-900"
                        : "bg-transparent border-gray-300 text-gray-600 hover:border-gray-500"
                    }`}
                  >
                    {option}%
                  </button>
                ))}
                <div className="flex items-center gap-1 ml-auto">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={slippageTolerance}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "") {
                        setSlippageTolerance("0.5");
                        return;
                      }
                      if (!/^\d*\.?\d*$/.test(value)) return;
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                        setSlippageTolerance(value);
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (!value || isNaN(parseFloat(value))) {
                        setSlippageTolerance("0.5");
                      }
                    }}
                    placeholder="0.5"
                    className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FOOTER */}
      <div className="text-center text-sm text-gray-600 italic mt-4 mb-4">
        Complete this transaction using your wallet.{" "}
        <a href="#" className="text-blue-600 hover:text-blue-800 underline not-italic">
          Help
        </a>
      </div>
    </div>
  );
}
