import { create } from 'zustand';

/**
 * Profile edits tracking store
 */
export interface PendingEdits {
  profile?: Record<string, any>;
  l?: any[];
  [key: string]: any;
}

interface EditsState {
  pendingEdits: PendingEdits;
  setPendingEdits: (edits: PendingEdits | ((prev: PendingEdits) => PendingEdits)) => void;
}

export const useEditsStore = create<EditsState>((set) => ({
  pendingEdits: {},
  setPendingEdits: (edits) =>
    set((state) => {
      const newEdits = typeof edits === 'function' ? edits(state.pendingEdits) : edits;
      return { pendingEdits: newEdits };
    }),
}));
