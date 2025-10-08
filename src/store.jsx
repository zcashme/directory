import { createContext, useContext, useState } from "react";

const FeedbackContext = createContext();

export function FeedbackProvider({ children }) {
  // ✅ safe read — after React is initialized
  const ADMIN_ADDRESS = import.meta.env.VITE_ADMIN_ADDRESS || "";

  // ✅ ensure a valid default, even if env variable is missing
  const [selectedAddress, setSelectedAddress] = useState(ADMIN_ADDRESS);

  return (
    <FeedbackContext.Provider value={{ selectedAddress, setSelectedAddress }}>
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  return useContext(FeedbackContext);
}
