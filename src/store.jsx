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
    const updated = {
      ...prev,
      [field]: value,
    };

    // Keep internal structure (arrays, objects) intact
    // but still broadcast a lightweight serialized summary
    const summary = Object.keys(updated)
      .map((k) => `${k}${Array.isArray(updated[k]) ? `[${updated[k].length}]` : ""}`)
      .join("; ");

    window.dispatchEvent(
      new CustomEvent("pendingEditsUpdated", { detail: summary })
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
