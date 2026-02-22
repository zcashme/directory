"use client";
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
import HelpMessage from "@/ui/verification/HelpMessage";
import SwapDepositDisplay from "@/ui/swap/SwapDepositDisplay";
import SwapQuoteDisplayComponent from "@/ui/swap/SwapQuoteDisplay";
import SwapSlippageControl from "@/ui/swap/SwapSlippageControl";
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
  confirmSwap
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
  const zecToken = tokenOptions.find(
    (token) =>
      token.symbol.toUpperCase() === "ZEC" &&
      token.blockchain.toLowerCase().includes("zec")
  );
  const zecTokenId = getTokenId(zecToken) ?? "";
  const returnToZec = () => {
    if (zecTokenId) setToken(zecTokenId);
  };

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


  return (
    <div className="bg-transparent border-none shadow-none p-0 relative z-10">
      {/* DISABLED MEMO FIELD */}
      <div className="relative mb-2">
        <div className="absolute left-3 top-3 pointer-events-none text-gray-500 h-5 w-5 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M3 11L4 8L9.5 2.5C9.9 2.1 10.5 2.1 10.9 2.5L11.5 3.1C11.9 3.5 11.9 4.1 11.5 4.5L6 10L3 11Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <textarea
          rows={3}
          readOnly
          aria-disabled="true"
          placeholder="Messaging is only available when sending ZEC → ZEC"
          onClick={returnToZec}
          onFocus={(e) => {
            e.currentTarget.blur();
            returnToZec();
          }}
          className="border border-gray-800 px-3 py-2 rounded-xl w-full text-md resize-none pr-7 pl-8 pb-8 bg-gray-100 text-gray-400 outline-hidden cursor-not-allowed"
        />
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
        <SwapQuoteDisplayComponent
          quote={quotePreview}
          recipientName={recipientName}
          showAmounts={true}
          className="mt-3"
        />
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
            className={`flex-1 px-4 py-3 text-md font-semibold rounded-xl transition-colors ${
              canGetQuote
                ? "bg-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue)]/90 text-white cursor-pointer"
                : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-300"
            }`}
          >
            {isGettingQuote ? "Getting quote..." : "Get a quote"}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirmQuote();
            }}
            disabled={!canConfirmQuote}
            className={`flex-1 px-4 py-3 text-md font-semibold rounded-xl transition-colors ${
              canConfirmQuote
                ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-300"
            }`}
          >
            {isConfirming ? "Confirming..." : "Confirm quote"}
          </button>
        </div>
      )}

      {/* SWAP SETTINGS (Hidden after confirmation) */}
      {!statusKey?.depositAddress && (
        <div className="mt-3">
          <SwapSlippageControl
            value={slippageTolerance}
            onChange={setSlippageTolerance}
            variant="collapsible"
          />
        </div>
      )}

      {/* FOOTER HELP */}
      <HelpMessage
        className="mt-4 mb-4"
        helpText='After your confirm quote, scan the QR code below. Alternatively, copy the deposit address and send from your wallet. Send the exact amount shown to complete the swap.'
      />
    </div>
  );
}


