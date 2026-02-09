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

/**
 * Profile edits tracking store
 */
interface PendingEdits {
  profile?: Record<string, any>;
  l?: any[];
  [key: string]: any;
}

interface EditsState {
  pendingEdits: PendingEdits;
  editChangesRequested: boolean;
  setPendingEdits: (edits: PendingEdits | ((prev: PendingEdits) => PendingEdits)) => void;
  setEditChangesRequested: (requested: boolean | ((prev: boolean) => boolean)) => void;
}

export const useEditsStore = create<EditsState>((set) => ({
  pendingEdits: {},
  editChangesRequested: false,
  setPendingEdits: (edits) =>
    set((state) => {
      const newEdits = typeof edits === 'function' ? edits(state.pendingEdits) : edits;
      return { pendingEdits: newEdits };
    }),
  setEditChangesRequested: (requested) =>
    set((state) => ({
      editChangesRequested: typeof requested === 'function' ? requested(state.editChangesRequested) : requested,
    })),
}));
