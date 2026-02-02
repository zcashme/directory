"use client";
import { createContext, useState } from "react";

export const SelectionContext = createContext();

export function SelectionProvider({ children }) {
  // selectedAddress is kept for backward compat with NS directory pages.
  // Profile pages no longer read it — they use their server-fetched profile prop.
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [forceShowQR, setForceShowQR] = useState(false);

  return (
    <SelectionContext.Provider value={{
      selectedAddress, setSelectedAddress,
      forceShowQR, setForceShowQR,
    }}>
      {children}
    </SelectionContext.Provider>
  );
}
