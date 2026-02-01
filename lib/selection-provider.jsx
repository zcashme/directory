"use client";
import { createContext, useState } from "react";

export const SelectionContext = createContext();

export function SelectionProvider({ children }) {
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
