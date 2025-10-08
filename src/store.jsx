import { createContext, useContext, useState } from "react";

const FeedbackContext = createContext();

export function FeedbackProvider({ children }) {
  const [selectedAddress, setSelectedAddress] = useState(null);
  return (
    <FeedbackContext.Provider value={{ selectedAddress, setSelectedAddress }}>
      {children}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  return useContext(FeedbackContext);
}
