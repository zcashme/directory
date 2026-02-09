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
  isEditsPending: boolean;
  setPendingEdits: (edits: PendingEdits | ((prev: PendingEdits) => PendingEdits)) => void;
  setEditChangesRequested: (requested: boolean | ((prev: boolean) => boolean)) => void;
  setIsEditsPending: (pending: boolean | ((prev: boolean) => boolean)) => void;
  getSignUpMessage: () => string;
}

/**
 * Generates a custom message format based on pending edits
 */
function buildSignUpMessage(pendingEdits: PendingEdits): string {
  const profileEdits = pendingEdits.profile ?? {};
  const linkTokens = pendingEdits.l ?? [];

  const fieldMap: Record<string, string> = {
    name: 'n',
    display_name: 'h',
    bio: 'b',
    profile_image_url: 'i',
    links: 'l',
  };

  const pairs = Object.entries(profileEdits)
    .map(([key, value]) => {
      const shortKey = fieldMap[key] || key;
      if (Array.isArray(value)) {
        return `${shortKey}:[${value
          .filter((x) => x && x.trim?.() !== "")
          .map((x) => `"${x}"`)
          .join(",")}]`;
      }
      return `${shortKey}:"${value}"`;
    });

  if (linkTokens.length > 0) {
    pairs.push(`l:[${linkTokens.map((x) => `"${x}"`).join(",")}]`);
  }

  return pairs.length > 0 ? `{signup,${pairs.join(",")}}` : "{signup}";
}

export const useEditsStore = create<EditsState>((set, get) => ({
  pendingEdits: {},
  editChangesRequested: false,
  isEditsPending: false,
  setPendingEdits: (edits) =>
    set((state) => {
      const newEdits = typeof edits === 'function' ? edits(state.pendingEdits) : edits;
      return { pendingEdits: newEdits };
    }),
  setEditChangesRequested: (requested) =>
    set((state) => ({
      editChangesRequested: typeof requested === 'function' ? requested(state.editChangesRequested) : requested,
    })),
  setIsEditsPending: (pending) =>
    set((state) => ({
      isEditsPending: typeof pending === 'function' ? pending(state.isEditsPending) : pending,
    })),
  getSignUpMessage: () => buildSignUpMessage(get().pendingEdits),
}));
