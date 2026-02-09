import { create } from 'zustand';

/**
 * UI state store - manages profile UI selection state
 */
interface SelectionState {
  forceShowQR: boolean;
  selectedAddress: string | null;
  setForceShowQR: (forceShowQR: boolean | ((prev: boolean) => boolean)) => void;
  setSelectedAddress: (address: string | null) => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  forceShowQR: false,
  selectedAddress: null,
  setForceShowQR: (forceShowQR) =>
    set((state) => ({
      forceShowQR: typeof forceShowQR === 'function' ? forceShowQR(state.forceShowQR) : forceShowQR,
    })),
  setSelectedAddress: (address) => set({ selectedAddress: address }),
}));
