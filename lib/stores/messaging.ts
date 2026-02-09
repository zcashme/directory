import { create } from 'zustand';

type OtpPhaseHistoryItem = {
  phase?: string | null;
};

export type ProfileMode = "verification" | "swap" | "memo";

/**
 * Messaging store - manages memo/message composition and verification state for Zcash
 */
interface MessagingState {
  currentProfileAddress: string | null;
  mode: ProfileMode;
  showBack: boolean;
  verify: {
    amount: string;
    zId: number | null;
    requestId: string | null;
  };
  // Verification polling state
  verifyQrEnabled: boolean;
  pollStatus: string | null;
  pollOtpStatus: string | null;
  pollOtpPhase: string | null;
  pollOtpPhaseHistory: OtpPhaseHistoryItem[];
  otpInlineSuccess: boolean;
  pollError: string;
  pollDebug: string;
  pollStartedAt: string | null;
  pollElapsedMs: number;

  // Actions
  ensureProfile: (address: string) => void;
  setMode: (mode: ProfileMode | ((prev: ProfileMode) => ProfileMode)) => void;
  setShowBack: (showBack: boolean) => void;
  setVerify: (verify: { amount: string; zId: number | null; requestId: string | null } | ((prev: { amount: string; zId: number | null; requestId: string | null }) => { amount: string; zId: number | null; requestId: string | null })) => void;

  // Verification polling actions
  setVerifyQrEnabled: (enabled: boolean) => void;
  setPollStatus: (status: string | null) => void;
  setPollOtpStatus: (status: string | null) => void;
  setPollOtpPhase: (phase: string | null) => void;
  setPollOtpPhaseHistory: (history: OtpPhaseHistoryItem[]) => void;
  setOtpInlineSuccess: (success: boolean) => void;
  setPollError: (error: string) => void;
  setPollDebug: (debug: string | ((prev: string) => string)) => void;
  setPollStartedAt: (startedAt: string | null) => void;
  setPollElapsedMs: (elapsed: number) => void;
  resetVerificationPolling: () => void;
}

const initialVerifyState = {
  verifyQrEnabled: false,
  pollStatus: null,
  pollOtpStatus: null,
  pollOtpPhase: null,
  pollOtpPhaseHistory: [],
  otpInlineSuccess: false,
  pollError: '',
  pollDebug: '',
  pollStartedAt: null,
  pollElapsedMs: 0,
};

export const useMessagingStore = create<MessagingState>((set, get) => ({
  currentProfileAddress: null,
  mode: 'memo',
  showBack: false,
  verify: { amount: '0.003', zId: null, requestId: null },
  ...initialVerifyState,

  ensureProfile: (address) => {
    if (get().currentProfileAddress !== address) {
      set({
        currentProfileAddress: address,
        mode: 'memo',
        showBack: false,
        verify: { amount: '0.003', zId: null, requestId: null },
        ...initialVerifyState,
      });
    }
  },
  setMode: (mode) =>
    set((state) => ({
      mode: typeof mode === 'function' ? mode(state.mode) : mode,
    })),
  setShowBack: (showBack) => set({ showBack }),
  setVerify: (verify) =>
    set((state) => ({
      verify: typeof verify === 'function' ? verify(state.verify) : verify,
    })),

  // Verification polling actions
  setVerifyQrEnabled: (enabled) => set({ verifyQrEnabled: enabled }),
  setPollStatus: (status) => set({ pollStatus: status }),
  setPollOtpStatus: (status) => set({ pollOtpStatus: status }),
  setPollOtpPhase: (phase) => set({ pollOtpPhase: phase }),
  setPollOtpPhaseHistory: (history) => set({ pollOtpPhaseHistory: history }),
  setOtpInlineSuccess: (success) => set({ otpInlineSuccess: success }),
  setPollError: (error) => set({ pollError: error }),
  setPollDebug: (debug) =>
    set((state) => ({
      pollDebug: typeof debug === 'function' ? debug(state.pollDebug) : debug,
    })),
  setPollStartedAt: (startedAt) => set({ pollStartedAt: startedAt }),
  setPollElapsedMs: (elapsed) => set({ pollElapsedMs: elapsed }),
  resetVerificationPolling: () => set((state) => ({
    ...initialVerifyState,
    verify: { ...state.verify, zId: null, requestId: null },
  })),
}));
