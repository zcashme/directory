"use client";

import type { ReactNode } from "react";
import { NsSelectionProvider } from "./ns-selection-provider";
import { EditsProvider } from "@/app/[slug]/providers/edits-provider";
import { MessagingProvider } from "@/app/[slug]/providers/messaging-provider";
import { SwapProvider } from "@/app/[slug]/providers/swap-provider";

export default function NsProviders({ children }: { children: ReactNode }) {
  return (
    <NsSelectionProvider>
      <EditsProvider>
        <MessagingProvider>
          <SwapProvider>
            {children}
          </SwapProvider>
        </MessagingProvider>
      </EditsProvider>
    </NsSelectionProvider>
  );
}
