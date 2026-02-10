/**
 * Zustand store for thread feature state management
 * Handles message composition, verification polling, and message list
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { ThreadStore, ThreadMessageWithProfile } from "@/lib/thread/types";

export const useThreadStore = create<ThreadStore>()(
  immer((set, get) => ({
    // Message composition state
    messageComposition: "",
    setMessageComposition: (text: string) => {
      set((state) => {
        state.messageComposition = text;
      });
    },
    clearMessageComposition: () => {
      set((state) => {
        state.messageComposition = "";
      });
    },

    // Verification state
    verifyQrEnabled: false,
    setVerifyQrEnabled: (enabled: boolean) => {
      set((state) => {
        state.verifyQrEnabled = enabled;
      });
    },

    // Polling state
    pollStatus: null,
    pollError: null,
    isPolling: false,
    pollOtpPhase: null,

    setPollStatus: (status: string | null) => {
      set((state) => {
        state.pollStatus = status;
      });
    },

    setPollError: (error: string | null) => {
      set((state) => {
        state.pollError = error;
      });
    },

    setIsPolling: (polling: boolean) => {
      set((state) => {
        state.isPolling = polling;
      });
    },

    setPollOtpPhase: (phase: string | null) => {
      set((state) => {
        state.pollOtpPhase = phase;
      });
    },

    // Request tracking
    currentRequestId: null,
    setCurrentRequestId: (id: string | null) => {
      set((state) => {
        state.currentRequestId = id;
      });
    },

    // Messages
    messages: [],
    setMessages: (messages: ThreadMessageWithProfile[]) => {
      set((state) => {
        state.messages = messages;
      });
    },

    addMessage: (message: ThreadMessageWithProfile) => {
      set((state) => {
        // Add to the beginning of the list (newest first)
        state.messages.unshift(message);
      });
    },

    // UI state
    isOtpFormOpen: false,
    setIsOtpFormOpen: (open: boolean) => {
      set((state) => {
        state.isOtpFormOpen = open;
      });
    },
  }))
);

/**
 * Helper hook to reset thread store to initial state
 */
export function useResetThreadStore() {
  const store = useThreadStore();
  return () => {
    store.setMessageComposition("");
    store.setVerifyQrEnabled(false);
    store.setPollStatus(null);
    store.setPollError(null);
    store.setIsPolling(false);
    store.setPollOtpPhase(null);
    store.setCurrentRequestId(null);
    store.setIsOtpFormOpen(false);
  };
}
