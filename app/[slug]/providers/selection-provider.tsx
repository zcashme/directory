"use client";
import { createContext, useState, useContext } from "react";
import type { ReactNode } from "react";
import type { SelectionContextType } from "./types";

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [forceShowQR, setForceShowQR] = useState<boolean>(false);

  const value: SelectionContextType = {
    forceShowQR,
    setForceShowQR,
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection(): SelectionContextType {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used within SelectionProvider");
  }
  return context;
}
