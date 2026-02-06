"use client";
import { useMemo, useEffect, useRef } from "react";
import { getTokenId } from "@/lib/swap/swapPayload";

function MemoCounter({ text }) {
  const bytes = useMemo(() => new TextEncoder().encode(text || "").length, [text]);
  const over = bytes > 512;
  const diff = over ? bytes - 512 : 512 - bytes;

  return (
    <span className={`absolute bottom-3 right-3 text-md ${over ? "text-red-600" : "text-gray-400"}`}>
      {over ? `Over by ${diff} bytes` : `${diff} bytes left`}
    </span>
  );
}

export default function SwapComposer({
  profile,
  tokenOptions = [],
  originTokenId,
  originSymbol,
  originBlockchain,
  onSetToken,
  swapAmount,
  onSetSwapAmount,
  refundAddress,
  onSetRefundAddress,
  slippageTolerance,
  onSetSlippageTolerance,
  onGetQuote,
  onConfirmQuote,
  isGettingQuote,
  isConfirming,
  quotePreview,
  onCancelSwapMode,
}) {
  const textareaRef = useRef(null);

  const recipientName = profile?.display_name || profile?.name || "Recipient";

  const selectedToken = useMemo(() => {
    return tokenOptions.find((t) => getTokenId(t) === originTokenId);
  }, [tokenOptions, originTokenId]);

  const canGetQuote = !isGettingQuote && swapAmount && refundAddress && parseFloat(swapAmount) > 0;
  const canConfirmQuote = !isConfirming && quotePreview;

  return (
    <div className="bg-transparent border-none shadow-none p-0 -mt-4 relative z-10">

      {/* HEADER ROW: Recipient + QR Icon */}
      <div className="flex justify-between items-start relative mb-3">
        {/* Left side */}
        <div className="text-md font-semibold text-gray-800 whitespace-normal pt-2">
          Send to {" "}
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            {recipientName}
          </span>
        </div>

        {/* Right side: QR icon */}
        <div className="flex items-center gap-3 ml-3">
          <div className="w-10 h-10 border border-gray-800 rounded-xl flex items-center justify-center bg-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
            </svg>
          </div>
        </div>
      </div>

      {/* MEMO FIELD - DISABLED */}
      <div className="relative mb-2">
        <textarea
          ref={textareaRef}
          rows={3}
          value=""
          disabled={true}
          placeholder="Message is available only when sending ZEC"
          className="border border-gray-800 px-3 py-2 rounded-xl w-full text-md resize-none text-gray-700 bg-gray-100 text-gray-400 cursor-not-allowed"
        />

        <button className="absolute right-3 top-3 text-gray-400 cursor-pointer">
          ×
        </button>

        <MemoCounter text="" />
      </div>

      {/* AMOUNT INPUT WITH TOKEN DROPDOWN */}
      <div className="mb-3">
        <div className="flex items-stretch gap-0 border border-gray-800 rounded-xl overflow-hidden bg-white">
          {/* Amount input */}
          <input
            type="number"
            step="any"
            min="0"
            value={swapAmount}
            onChange={(e) => onSetSwapAmount(e.target.value)}
            placeholder="0"
            className="flex-1 px-3 py-3 text-md text-gray-900 border-none focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          {/* Token dropdown */}
          <select
            value={originTokenId || ""}
            onChange={(e) => onSetToken(e.target.value)}
            className="px-3 py-3 text-md text-gray-900 border-none border-l border-gray-800 focus:outline-none focus:ring-0 bg-white cursor-pointer appearance-none pr-8"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.75rem center',
            }}
          >
            <option value="">Select token</option>
            {tokenOptions.map((token) => {
              const tokenId = getTokenId(token);
              return (
                <option key={tokenId} value={tokenId}>
                  {token.symbol || token.ticker || ""}
                </option>
              );
            })}
          </select>

          {/* Dollar sign */}
          <div className="flex items-center justify-center px-3 text-md text-gray-500 border-l border-gray-800">
            $
          </div>
        </div>
      </div>

      {/* REFUND ADDRESS */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-2 text-center">
          Your {originSymbol || selectedToken?.symbol || "ETH"} refund address (in case swap fails)
        </label>
        <input
          type="text"
          value={refundAddress}
          onChange={(e) => onSetRefundAddress(e.target.value)}
          placeholder={`Paste your ${originSymbol || selectedToken?.symbol || "ETH"} address`}
          className="w-full border border-gray-800 px-3 py-3 rounded-xl text-md text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white placeholder:text-gray-400"
        />
      </div>

      {/* SWAP SETTINGS BOX */}
      <div className="mb-4 p-4 rounded-xl border border-gray-800 bg-white">
        <h3 className="text-md font-semibold text-gray-800 mb-3">Swap settings</h3>

        <label className="block text-sm font-medium text-gray-600 mb-2 text-center">
          Slippage tolerance (%)
        </label>

        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {["0.1", "0.5", "1", "2", "5"].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onSetSlippageTolerance(value)}
                className={`px-4 py-2 text-sm border border-gray-800 rounded-lg transition-colors whitespace-nowrap ${
                  slippageTolerance === value
                    ? "bg-gray-800 text-white font-semibold"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {value}%
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={slippageTolerance}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || (parseFloat(val) >= 0 && parseFloat(val) <= 100)) {
                  onSetSlippageTolerance(val);
                }
              }}
              className="w-20 border border-gray-800 px-3 py-2 rounded-lg text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-white"
            />
            <span className="text-sm text-gray-600">%</span>
          </div>
        </div>

        <div className="flex flex-col min-[480px]:flex-row gap-3">
          <button
            type="button"
            onClick={onGetQuote}
            disabled={!canGetQuote}
            className={`w-full min-[480px]:w-1/2 px-4 py-3 text-md font-medium border border-black rounded-xl transition-colors ${
              canGetQuote
                ? "bg-white text-gray-800 hover:bg-gray-50"
                : "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300"
            }`}
          >
            {isGettingQuote ? "Getting quote..." : "Get quote"}
          </button>
          <button
            type="button"
            onClick={onConfirmQuote}
            disabled={!canConfirmQuote}
            className={`w-full min-[480px]:w-1/2 px-4 py-3 text-md font-medium border border-black rounded-xl transition-colors ${
              canConfirmQuote
                ? "bg-white text-gray-800 hover:bg-gray-50"
                : "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-300"
            }`}
          >
            {isConfirming ? "Confirming..." : "Confirm quote"}
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <div className="text-center text-sm text-gray-600 italic mb-4">
        Complete this transaction using your wallet. {" "}
        <a href="#" className="text-blue-600 hover:text-blue-800 underline not-italic">
          Help
        </a>
      </div>
    </div>
  );
}
