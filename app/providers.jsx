"use client";

import { SelectionProvider } from "@/ui/profile/selection-provider";
import { EditsProvider } from "@/ui/profile/edits-provider";
import { MessagingProvider } from "@/ui/messaging/messaging-provider";
import { SwapProvider } from "@/ui/swap/SwapProvider";

export default function Providers({ children }) {
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
