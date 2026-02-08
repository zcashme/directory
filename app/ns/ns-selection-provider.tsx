"use client";
import { createContext, useState, useContext } from "react";
import type { ReactNode } from "react";
import type { NsSelectionContextType } from "./types";

const NsSelectionContext = createContext<NsSelectionContextType | undefined>(undefined);

export function NsSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [forceShowQR, setForceShowQR] = useState<boolean>(false);

  const value: NsSelectionContextType = {
    selectedAddress,
    setSelectedAddress,
    forceShowQR,
    setForceShowQR,
  };

  return (
    <NsSelectionContext.Provider value={value}>
      {children}
    </NsSelectionContext.Provider>
  );
}

export function useNsSelection(): NsSelectionContextType {
  const context = useContext(NsSelectionContext);
  if (!context) {
    throw new Error("useNsSelection must be used within NsSelectionProvider");
  }
  return context;
}

// Export the context for compatibility with existing code that uses useContext directly
export { NsSelectionContext };
