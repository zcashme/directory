import { create } from 'zustand';
import type { PendingEdits } from '@/lib/profile/types';

declare global {
  interface Window {
    pendingEdits?: PendingEdits;
  }
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
      // Side effect: sync to window.pendingEdits
      if (typeof window !== 'undefined') {
        window.pendingEdits = newEdits;
      }
      return { pendingEdits: newEdits };
    }),
  setEditChangesRequested: (requested) =>
    set((state) => ({
      editChangesRequested: typeof requested === 'function' ? requested(state.editChangesRequested) : requested,
    })),
}));
