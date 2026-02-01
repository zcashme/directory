"use client";
import { createContext, useState, useEffect } from "react";

export const EditsContext = createContext();

export function EditsProvider({ children }) {
  const [pendingEdits, _setPendingEdits] = useState({});
  const [editChangesRequested, setEditChangesRequested] = useState(false);

  const setPendingEdits = (field, value) => {
    _setPendingEdits((prev) => ({ ...prev, [field]: value }));
  };
  const clearPendingEdits = () => _setPendingEdits({});

  useEffect(() => {
    if (pendingEdits) window.pendingEdits = pendingEdits;
  }, [pendingEdits]);

  return (
    <EditsContext.Provider value={{
      pendingEdits, setPendingEdits, clearPendingEdits,
      editChangesRequested, setEditChangesRequested,
    }}>
      {children}
    </EditsContext.Provider>
  );
}
