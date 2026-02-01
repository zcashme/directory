"use client";

import { SelectionProvider } from "@/lib/selection-provider";
import { EditsProvider } from "@/lib/edits-provider";
import { MessagingProvider } from "@/lib/messaging-provider";

export default function Providers({ children }) {
  return (
    <SelectionProvider>
      <EditsProvider>
        <MessagingProvider>
          {children}
        </MessagingProvider>
      </EditsProvider>
    </SelectionProvider>
  );
}
