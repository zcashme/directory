import { createContext, useContext, useState } from "react";

const FeedbackContext = createContext();

export function FeedbackProvider({ children }) {
  const ADMIN_ADDRESS = import.meta.env.VITE_ADMIN_ADDRESS || "";

  const [selectedAddress, setSelectedAddress] = useState(ADMIN_ADDRESS);
  const [forceShowQR, setForceShowQR] = useState(false); // ✅ new flag

  return (
    <FeedbackContext.Provider
      value={{ selectedAddress, setSelectedAddress, forceShowQR, setForceShowQR }}
    >
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  return useContext(FeedbackContext);
}
