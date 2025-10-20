import { createContext, useContext, useState } from "react";

const FeedbackContext = createContext();

export function FeedbackProvider({ children }) {
  const ADMIN_ADDRESS = import.meta.env.VITE_ADMIN_ADDRESS || "";

  // Existing state
  const [selectedAddress, setSelectedAddress] = useState(ADMIN_ADDRESS);
  const [forceShowQR, setForceShowQR] = useState(false);

  // --- NEW: Pending-edit state for live profile updates ---
  const [pendingEdits, setPendingEdits] = useState({});

  // Add or update a single field
  const setPendingEdit = (field, value) => {
    setPendingEdits((prev) => {
      const updated = { ...prev, [field]: value };

      // Serialize edits to compact string form for the feedback QR memo
      const serialized = Object.entries(updated)
        .map(([k, v]) => `${k}:${String(v).slice(0, 64)}`)
        .join("; ");

      // Notify listeners (e.g., ZcashFeedback)
      window.dispatchEvent(
        new CustomEvent("pendingEditsUpdated", { detail: serialized })
      );

      return updated;
    });
  };

  // Clear all edits
  const clearPendingEdits = () => setPendingEdits({});

  return (
    <FeedbackContext.Provider
      value={{
        selectedAddress,
        setSelectedAddress,
        forceShowQR,
        setForceShowQR,
        pendingEdits,
        setPendingEdit,
        clearPendingEdits,
      }}
    >
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  return useContext(FeedbackContext);
}
