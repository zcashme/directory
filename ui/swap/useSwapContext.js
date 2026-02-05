import { useContext } from "react";
import { SwapContext } from "@/ui/swap/SwapProvider";

export function useSwapContext() {
  const context = useContext(SwapContext);
  if (!context) {
    throw new Error("useSwapContext must be used within SwapProvider");
  }
  return context;
}

export default useSwapContext;
