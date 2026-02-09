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
