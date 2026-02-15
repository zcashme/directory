import { create } from 'zustand';

export type ProfileMode = "verification" | "swap" | "memo";

interface VerifyState {
  amount: string;
  zId: number | null;
  sessionId: string | null;
  userAddress: string | null;
}

interface MessagingState {
  currentProfileAddress: string | null;
  mode: ProfileMode;
  showBack: boolean;

  // Memo composition state
  memo: string;
  amount: string;

  verify: VerifyState;

  // Verification state
  verifyQrEnabled: boolean;
  verificationError: string;

  // Actions
  ensureProfile: (address: string) => void;
  setMode: (mode: ProfileMode | ((prev: ProfileMode) => ProfileMode)) => void;
  setShowBack: (showBack: boolean) => void;
  setMemo: (memo: string) => void;
  setAmount: (amount: string) => void;
  setVerify: (verify: VerifyState | ((prev: VerifyState) => VerifyState)) => void;

  // Verification actions
  setVerifyQrEnabled: (enabled: boolean) => void;
  setVerificationError: (error: string) => void;
  resetVerification: () => void;
}

const initialVerifyState: VerifyState = {
  amount: '0.003',
  zId: null,
  sessionId: null,
  userAddress: null,
};

const initialVerificationState = {
  verifyQrEnabled: false,
  verificationError: '',
};

export const useMessagingStore = create<MessagingState>((set, get) => ({
  currentProfileAddress: null,
  mode: 'memo',
  showBack: false,
  memo: '',
  amount: '',
  verify: { ...initialVerifyState },
  ...initialVerificationState,

  ensureProfile: (address) => {
    if (get().currentProfileAddress !== address) {
      set({
        currentProfileAddress: address,
        mode: 'memo',
        showBack: false,
        memo: '',
        amount: '',
        verify: { ...initialVerifyState },
        ...initialVerificationState,
      });
    }
  },

  setMode: (mode) =>
    set((state) => ({
      mode: typeof mode === 'function' ? mode(state.mode) : mode,
    })),

  setShowBack: (showBack) => set({ showBack }),
  setMemo: (memo) => set({ memo }),
  setAmount: (amount) => set({ amount }),

  setVerify: (verify) =>
    set((state) => ({
      verify: typeof verify === 'function' ? verify(state.verify) : verify,
    })),

  // Verification actions
  setVerifyQrEnabled: (enabled) => set({ verifyQrEnabled: enabled }),
  setVerificationError: (error) => set({ verificationError: error }),

  resetVerification: () =>
    set({
      verify: { ...initialVerifyState },
      ...initialVerificationState,
    }),
}));
