"use client";

import { SelectionProvider } from "@/ui/profile/selection-provider";
import { EditsProvider } from "@/ui/profile/edits-provider";
import { MessagingProvider } from "@/ui/messaging/messaging-provider";
import { SwapProvider } from "@/ui/swap/SwapProvider";
// Server Actions imported in app layer
import { getSwapTokens } from "@/lib/swap/tokensAction";
import { getSwapQuote } from "@/lib/swap/quoteAction";
import { confirmSwapAction } from "@/lib/swap/confirmAction";
import { getSwapStatus } from "@/lib/swap/statusAction";

export default function Providers({ children }) {
  return (
    <SelectionProvider>
      <EditsProvider>
        <MessagingProvider>
          <SwapProvider
            getSwapTokens={getSwapTokens}
            getSwapQuote={getSwapQuote}
            confirmSwapAction={confirmSwapAction}
            getSwapStatus={getSwapStatus}
          >
            {children}
          </SwapProvider>
        </MessagingProvider>
      </EditsProvider>
    </SelectionProvider>
  );
}
