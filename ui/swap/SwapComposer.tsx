"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Profile } from "@/lib/profile/types";
import type {
  SwapConfirmData,
  SwapContextQuoteData,
  SwapQuoteData,
  SwapQuoteDisplay,
  Token,
} from "@/lib/swap/types";
import type { Result } from "@/lib/actions/types";

const isConfirmSuccess = (data: SwapContextQuoteData | null): data is Result<SwapConfirmData> =>
  Boolean(data && data.ok === true && "deposit" in data.data);
import AmountAndWallet from "@/ui/verification/AmountAndWallet";
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
  resetSwapProgress: () => void;
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
  }) => Promise<Result<SwapQuoteData> | null>;
  confirmSwap: (_params: {
    amountIn: string;
    destAddress: string;
    fromToken?: string;
    toToken?: string;
    refund?: string;
    slippage?: string;
  }) => Promise<Result<SwapConfirmData> | null>;
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
  resetSwapProgress,
  // Actions
  setToken,
  setSwapAmount,
  setRefundAddress,
  setSlippageTolerance,
  getQuote,
  confirmSwap
}: SwapComposerProps) {

  const rootRef = useRef<HTMLDivElement | null>(null);
  const recipientName = profile?.display_name ?? profile?.name ?? "Recipient";
  const confirmedQuote = isConfirmSuccess(quoteData) ? quoteData : null;
  const depositAmountDecimal = confirmedQuote?.data?.deposit?.amountDecimal ?? "";
  const [isRefundAddressValid, setIsRefundAddressValid] = useState(false);
  const [isMemoCompact, setIsMemoCompact] = useState(false);
  const autoQuoteKeyRef = useRef("");
  const autoConfirmKeyRef = useRef("");
  const wasRefundValidRef = useRef(false);
  const previousFlowStepRef = useRef("none");

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

  useEffect(() => {
    const parsedAmount = Number.parseFloat(swapAmount);
    const trimmedRefundAddress = refundAddress.trim();
    const canAutoQuote =
      isRefundAddressValid &&
      Number.isFinite(parsedAmount) &&
      parsedAmount > 0 &&
      !!trimmedRefundAddress &&
      !statusKey?.depositAddress;

    if (!canAutoQuote) {
      autoQuoteKeyRef.current = "";
      return;
    }

    const nextQuoteKey = [
      swapAmount,
      trimmedRefundAddress,
      slippageTolerance,
      profile?.address || "",
    ].join("|");

    if (autoQuoteKeyRef.current === nextQuoteKey || isGettingQuote) {
      return;
    }

    autoQuoteKeyRef.current = nextQuoteKey;
    void getQuote({
      amountIn: swapAmount,
      destAddress: profile?.address || "",
      refund: trimmedRefundAddress,
      slippage: slippageTolerance,
    });
  }, [
    isRefundAddressValid,
    swapAmount,
    refundAddress,
    slippageTolerance,
    profile?.address,
    statusKey?.depositAddress,
    isGettingQuote,
    getQuote,
  ]);

  useEffect(() => {
    const trimmedRefundAddress = refundAddress.trim();
    const canAutoConfirm =
      !!quotePreview &&
      isRefundAddressValid &&
      !!trimmedRefundAddress &&
      !isGettingQuote &&
      !isConfirming &&
      !statusKey?.depositAddress;

    if (!canAutoConfirm) {
      if (!quotePreview) autoConfirmKeyRef.current = "";
      return;
    }

    const nextConfirmKey = [
      swapAmount,
      trimmedRefundAddress,
      slippageTolerance,
      profile?.address || "",
    ].join("|");

    if (autoConfirmKeyRef.current === nextConfirmKey) return;
    autoConfirmKeyRef.current = nextConfirmKey;

    void confirmSwap({
      amountIn: swapAmount,
      destAddress: profile?.address || "",
      refund: trimmedRefundAddress,
      slippage: slippageTolerance,
    });
  }, [
    quotePreview,
    isRefundAddressValid,
    refundAddress,
    isGettingQuote,
    isConfirming,
    statusKey?.depositAddress,
    swapAmount,
    slippageTolerance,
    profile?.address,
    confirmSwap,
  ]);

  const showFlowBox =
    isRefundAddressValid &&
    (isGettingQuote ||
      isConfirming ||
      !!quotePreview ||
      !!statusKey?.depositAddress ||
      !!swapError);
  const isGettingQuoteVisible =
    isGettingQuote && !quotePreview && !statusKey?.depositAddress;
  const isQuoteVisible = !!quotePreview && !isConfirming && !statusKey?.depositAddress;
  const isConfirmingVisible = !!quotePreview && isConfirming && !statusKey?.depositAddress;
  const isDepositVisible = !!statusKey?.depositAddress && !!quotePreview;
  const currentFlowStep = !isRefundAddressValid
    ? "none"
    : isDepositVisible
      ? "deposit"
      : isConfirmingVisible
        ? "confirming"
        : isQuoteVisible
          ? "quote"
          : isGettingQuoteVisible
            ? "getting-quote"
            : "refund-valid";
  const showInlineSlippage = Number.parseFloat(swapAmount) > 0;
  const hasFlowContentBeforeError =
    (isGettingQuote && !quotePreview && !statusKey?.depositAddress) ||
    !!quotePreview ||
    (quotePreview && isConfirming && !statusKey?.depositAddress) ||
    (!!statusKey?.depositAddress && !!quotePreview);
  const isWarningStatus = /too low|warning|insufficient|min(imum)?|at least/i.test(quoteStatus);
  const handleGetNewQuote = () => {
    autoQuoteKeyRef.current = "";
    autoConfirmKeyRef.current = "";
    resetSwapProgress();
  };

  useEffect(() => {
    const raf = window.requestAnimationFrame(() => {
      setIsMemoCompact(true);
    });
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const scrollToAbsoluteBottom = () => {
    const scrollOnePass = () => {
      const root = rootRef.current;
      const seen = new Set<HTMLElement>();
      const scrollables: HTMLElement[] = [];

      let node: HTMLElement | null = root;
      while (node) {
        if (seen.has(node)) break;
        seen.add(node);
        const style = window.getComputedStyle(node);
        const canScrollY =
          (style.overflowY === "auto" || style.overflowY === "scroll") &&
          node.scrollHeight > node.clientHeight;
        if (canScrollY) scrollables.push(node);
        node = node.parentElement;
      }

      for (const scroller of scrollables) {
        scroller.scrollTop = scroller.scrollHeight;
      }

      const bottom = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      window.scrollTo({ top: bottom, behavior: "auto" });
    };

    scrollOnePass();
    window.requestAnimationFrame(scrollOnePass);
    window.setTimeout(scrollOnePass, 80);
    window.setTimeout(scrollOnePass, 180);
    window.setTimeout(scrollOnePass, 320);
  };

  useEffect(() => {
    if (isRefundAddressValid && !wasRefundValidRef.current) {
      const active = document.activeElement as HTMLElement | null;
      active?.blur();
      scrollToAbsoluteBottom();
    }
    wasRefundValidRef.current = isRefundAddressValid;
  }, [isRefundAddressValid]);

  useEffect(() => {
    if (!isRefundAddressValid) {
      previousFlowStepRef.current = "none";
      return;
    }

    if (previousFlowStepRef.current !== currentFlowStep) {
      scrollToAbsoluteBottom();
      previousFlowStepRef.current = currentFlowStep;
    }
  }, [isRefundAddressValid, currentFlowStep]);


  return (
    <div ref={rootRef} className="bg-transparent border-none shadow-none p-0 relative z-10">
      {/* DISABLED MEMO FIELD */}
      <motion.div
        initial={false}
        animate={{ height: isMemoCompact ? 44 : 96 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className="relative mb-4 overflow-hidden"
      >
        <div className="relative h-full">
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
            rows={1}
            readOnly
            aria-disabled="true"
            placeholder="Messaging only available ZEC to ZEC"
            onClick={returnToZec}
            onFocus={(e) => {
              e.currentTarget.blur();
              returnToZec();
            }}
            className="border border-gray-800 px-3 py-2 rounded-xl w-full h-full text-md resize-none pr-7 pl-8 bg-gray-100 text-gray-400 outline-hidden cursor-not-allowed"
          />
        </div>
      </motion.div>

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
        showRefund={Number.parseFloat(swapAmount) > 0}
        refundAddress={refundAddress}
        setRefundAddress={setRefundAddress}
        recipientName={recipientName}
        onRefundValidationChange={setIsRefundAddressValid}
        validationTrigger={slippageTolerance}
        betweenAmountAndRefund={
          showInlineSlippage ? (
            <SwapSlippageControl
              value={slippageTolerance}
              onChange={setSlippageTolerance}
              variant="collapsible"
            />
          ) : null
        }
      />

      <AnimatePresence initial={false}>
        {showFlowBox && (
          <motion.div
            key="swap-flow-box"
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="mt-3 p-3 rounded-xl border border-gray-800 bg-transparent text-sm text-gray-700 overflow-hidden"
          >
          <AnimatePresence initial={false}>
            {isGettingQuote && !quotePreview && !statusKey?.depositAddress && (
              <motion.div
                key="getting-quote"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="flex flex-col items-center justify-center gap-1.5 min-h-16">
                  <div className="flex gap-0.5">
                    {[0, 0.1, 0.2].map((delay, i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 bg-gray-800 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}s` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-600">Getting quote</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false} mode="sync">
            {/* QUOTE PREVIEW DISPLAY */}
            {quotePreview && !statusKey?.depositAddress && (
              <motion.div
                key="quote-preview"
                layout
                initial={{ opacity: 0, height: 1 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="overflow-hidden"
                onAnimationComplete={scrollToAbsoluteBottom}
              >
                <SwapQuoteDisplayComponent
                  quote={quotePreview}
                  recipientName={recipientName}
                  showAmounts={true}
                  selectedSlippage={slippageTolerance}
                />
              </motion.div>
            )}

            {/* SWAP DEPOSIT DISPLAY */}
            {statusKey?.depositAddress && !!quotePreview && (
              <motion.div
                key="deposit-display"
                layout
                initial={{ opacity: 0, y: 6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="overflow-hidden"
                onAnimationComplete={scrollToAbsoluteBottom}
              >
                <SwapDepositDisplay
                  depositUri={depositUri}
                  depositAddress={statusKey?.depositAddress}
                  amountDecimal={depositAmountDecimal}
                  originSymbol={originSymbol}
                  recipientName={recipientName}
                  receivedAmount={quotePreview?.amountOutFormatted}
                  receivedSymbol={quotePreview?.toSymbol ?? "ZEC"}
                  minimumReceived={quotePreview?.minAmountOut}
                  estimatedTime={quotePreview?.timeEstimate}
                  onGetNewQuote={handleGetNewQuote}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* CONFIRM LOADING STATUS */}
          {quotePreview && isConfirming && !statusKey?.depositAddress && (
            <motion.div
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mt-3 flex flex-col items-center justify-center gap-1.5 min-h-14"
              onAnimationComplete={scrollToAbsoluteBottom}
            >
              <div className="flex gap-0.5">
                {[0, 0.1, 0.2].map((delay, i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-gray-800 rounded-full animate-bounce"
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-600">Confirming quote</span>
            </motion.div>
          )}

          {/* ERROR MESSAGE */}
          {swapError && (
            <div
              className={`rounded-xl border border-red-300 bg-red-50 text-red-700 text-sm px-3 py-2 text-center min-h-11 flex items-center justify-center whitespace-pre-line ${
                hasFlowContentBeforeError ? "mt-3" : ""
              }`}
            >
              {swapError}
            </div>
          )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* STATUS MESSAGE (Before quote/polling) */}
      {quoteStatus && !isGettingQuote && !isConfirming && !quotePreview && !statusKey?.depositAddress && (
        <div
          className={`mt-3 p-3 rounded-xl text-sm ${
            isWarningStatus
              ? "border border-red-300 bg-red-50 text-red-700 text-center min-h-11 flex items-center justify-center"
              : "border border-gray-800 bg-white text-gray-700"
          }`}
        >
          {quoteStatus}
        </div>
      )}

    </div>
  );
}
