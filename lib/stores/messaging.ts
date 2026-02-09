import { create } from 'zustand';

/**
 * Messaging store - manages memo/message composition state for Zcash
 */
interface MessagingState {
  mode: string;
  draft: {
    memo: string;
    amount: string;
  };
  verify: {
    memo: string;
    amount: string;
    zId: number | null;
    requestId: string | null;
  };
  setMode: (mode: string | ((prev: string) => string)) => void;
  setDraft: (draft: { memo: string; amount: string } | ((prev: { memo: string; amount: string }) => { memo: string; amount: string })) => void;
  setVerify: (verify: { memo: string; amount: string; zId: number | null; requestId: string | null } | ((prev: { memo: string; amount: string; zId: number | null; requestId: string | null }) => { memo: string; amount: string; zId: number | null; requestId: string | null })) => void;
}

export const useMessagingStore = create<MessagingState>((set) => ({
  mode: 'note',
  draft: { memo: '', amount: '' },
  verify: { memo: '', amount: '0', zId: null, requestId: null },
  setMode: (mode) =>
    set((state) => ({
      mode: typeof mode === 'function' ? mode(state.mode) : mode,
    })),
  setDraft: (draft) =>
    set((state) => ({
      draft: typeof draft === 'function' ? draft(state.draft) : draft,
    })),
  setVerify: (verify) =>
    set((state) => ({
      verify: typeof verify === 'function' ? verify(state.verify) : verify,
    })),
}));
