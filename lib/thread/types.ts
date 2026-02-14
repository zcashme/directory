/**
 * Thread feature types
 */

export interface ThreadMessage {
  id: string;
  user_id: string;
  username: string;
  profile_image_url?: string;
  verified: boolean;
  content: string;
  board_id: string;
  created_at: string;
}

export interface ThreadMessageWithProfile extends ThreadMessage {
  username: string;
  profile_image_url?: string;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  created_at: string;
  member_count: number;
}

export interface ThreadStore {
  // Messages
  messages: ThreadMessage[];
  isLoadingMessages: boolean;

  // Current board
  currentBoardId: string;
  currentBoard?: Board;

  // All boards
  boards: Board[];
  isLoadingBoards: boolean;

  // UI state
  showComposer: boolean;

  // Actions
  setCurrentBoardId: (id: string) => void;
  setMessages: (messages: ThreadMessage[]) => void;
  addMessage: (message: ThreadMessage) => void;
  setBoards: (boards: Board[]) => void;
  setCurrentBoard: (board: Board) => void;
  setLoadingMessages: (loading: boolean) => void;
  setLoadingBoards: (loading: boolean) => void;
  setShowComposer: (show: boolean) => void;
}

// API response types
export interface GetMessagesResponse {
  success: boolean;
  data?: ThreadMessage[];
  error?: string;
}

export interface PostMessageResponse {
  success: boolean;
  data?: ThreadMessage;
  error?: string;
}

export interface GetBoardsResponse {
  success: boolean;
  data?: Board[];
  error?: string;
}

export interface CreateBoardResponse {
  success: boolean;
  data?: Board;
  error?: string;
}
