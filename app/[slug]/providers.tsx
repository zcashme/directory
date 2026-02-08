"use client";

import type { ReactNode } from "react";
import { SelectionProvider } from "./providers/selection-provider";
import { EditsProvider } from "./providers/edits-provider";
import { MessagingProvider } from "./providers/messaging-provider";
import { SwapProvider } from "./providers/swap-provider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SelectionProvider>
      <EditsProvider>
        <MessagingProvider>
          <SwapProvider>
            {children}
          </SwapProvider>
        </MessagingProvider>
      </EditsProvider>
    </SelectionProvider>
  );
}
