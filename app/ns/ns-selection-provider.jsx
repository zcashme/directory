"use client";
import { createContext, useState } from "react";

export const NsSelectionContext = createContext();

export function NsSelectionProvider({ children }) {
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [forceShowQR, setForceShowQR] = useState(false);

  return (
    <NsSelectionContext.Provider value={{
      selectedAddress, setSelectedAddress,
      forceShowQR, setForceShowQR,
    }}>
      {children}
    </NsSelectionContext.Provider>
  );
}
