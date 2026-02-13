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
import { withFieldBorderState } from "@/ui/styles/fields";

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
        <textarea
          rows={3}
          disabled
          placeholder={`Messaging is only available when sending ZEC → ZEC`}
          className="border border-gray-800 px-3 py-2 rounded-xl w-full text-md resize-none pr-7 bg-gray-100 text-gray-400 cursor-not-allowed"
        />

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
                ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
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

