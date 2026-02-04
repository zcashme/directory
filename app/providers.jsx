"use client";

import { SelectionProvider } from "@/ui/profile/selection-provider";
import { EditsProvider } from "@/ui/profile/edits-provider";
import { MessagingProvider } from "@/lib/messaging/messaging-provider";

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
