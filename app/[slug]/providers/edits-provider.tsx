"use client";
import { createContext, useState, useEffect, useContext } from "react";
import type { ReactNode } from "react";
import type { EditsContextType } from "./types";
import type { PendingEdits, PendingEditsField, PendingEditValue } from "@/lib/profile/types";

declare global {
  interface Window {
    pendingEdits?: PendingEdits;
  }
}

const EditsContext = createContext<EditsContextType | undefined>(undefined);

export function EditsProvider({ children }: { children: ReactNode }) {
  const [pendingEdits, setPendingEdits] = useState<PendingEdits>({});
  const [editChangesRequested, setEditChangesRequested] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.pendingEdits = pendingEdits;
  }, [pendingEdits]);

  const value: EditsContextType = {
    pendingEdits,
    setPendingEdits,
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
