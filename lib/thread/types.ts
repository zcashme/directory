/**
 * Thread Message Feature Types
 */

export interface ThreadMessage {
  id: number;
  zcasher_id: number | null;
  message_text: string;
  memo_hash?: string;
  tx_id?: string;
  request_id?: string;
  created_at: string;
  verified_at: string | null;
  is_visible: boolean;
}

export interface PendingThreadMessage {
  id: number;
  zcasher_id: number;
  request_id: string;
  message_text: string;
  memo_hash?: string;
  created_at: string;
  expires_at: string;
}

export interface ThreadMessageWithProfile extends ThreadMessage {
  profile?: {
    id: number;
    name: string;
    display_name?: string;
    avatar_url?: string;
    address: string;
    address_verified: boolean;
  } | null;
}

export interface ConfirmThreadOtpResponse {
  status: "confirmed" | "invalid" | "expired" | "error" | "locked";
  message: string;
  message_id?: number;
}

export interface ThreadStore {
  // Message composition state
  messageComposition: string;
  setMessageComposition: (text: string) => void;
  clearMessageComposition: () => void;

  // Verification state
  verifyQrEnabled: boolean;
  setVerifyQrEnabled: (enabled: boolean) => void;

  // Polling state
  pollStatus: string | null;
  pollError: string | null;
  isPolling: boolean;
  pollOtpPhase: string | null;
  setPollStatus: (status: string | null) => void;
  setPollError: (error: string | null) => void;
  setIsPolling: (polling: boolean) => void;
  setPollOtpPhase: (phase: string | null) => void;

  // Request tracking
  currentRequestId: string | null;
  setCurrentRequestId: (id: string | null) => void;

  // Messages
  messages: ThreadMessageWithProfile[];
  setMessages: (messages: ThreadMessageWithProfile[]) => void;
  addMessage: (message: ThreadMessageWithProfile) => void;

  // UI state
  isOtpFormOpen: boolean;
  setIsOtpFormOpen: (open: boolean) => void;
}

/**
 * Memo format for thread messages:
 * {z:ZCASHER_ID,t:"message text here"}
 *
 * Example:
 * {z:123,t:"Hello from the thread!"}
 */
export interface ThreadMemoFormat {
  z: number; // zcasher_id
  t: string; // thread message text
}

export interface StartThreadMessageResponse {
  ok: boolean;
  data?: {
    request_id: string;
    memo_uri: string;
  };
  error?: string;
}

export interface FetchThreadMessagesResponse {
  ok: boolean;
  data?: ThreadMessageWithProfile[];
  error?: string;
}
