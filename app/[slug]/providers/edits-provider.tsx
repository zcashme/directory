"use client";
import { createContext, useState, useEffect, useContext } from "react";
import type { ReactNode } from "react";
import type { EditsContextType } from "@/types/contexts";

const EditsContext = createContext<EditsContextType | undefined>(undefined);

export function EditsProvider({ children }: { children: ReactNode }) {
  const [pendingEdits, _setPendingEdits] = useState<Record<string, unknown>>({});
  const [editChangesRequested, setEditChangesRequested] = useState<boolean>(false);

  const setPendingEdits = (field: string, value: unknown) => {
    _setPendingEdits((prev) => ({ ...prev, [field]: value }));
  };
  const clearPendingEdits = () => _setPendingEdits({});

  useEffect(() => {
    if (pendingEdits) (window as any).pendingEdits = pendingEdits;
  }, [pendingEdits]);

  const value: EditsContextType = {
    pendingEdits,
    setPendingEdits,
    clearPendingEdits,
    editChangesRequested,
    setEditChangesRequested,
  };

  return (
    <EditsContext.Provider value={value}>
      {children}
    </EditsContext.Provider>
  );
}

export function useEdits(): EditsContextType {
  const context = useContext(EditsContext);
  if (!context) {
    throw new Error("useEdits must be used within EditsProvider");
  }
  return context;
}
