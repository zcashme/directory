"use client";
import { createContext, useState } from "react";

export const SelectionContext = createContext();

export function SelectionProvider({ children }) {
  const [forceShowQR, setForceShowQR] = useState(false);

  return (
    <SelectionContext.Provider value={{
      forceShowQR, setForceShowQR,
    }}>
      {children}
    </SelectionContext.Provider>
  );
}
