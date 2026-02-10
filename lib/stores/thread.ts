import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ThreadStore, ThreadMessage, Board } from '@/lib/thread/types';

export const useThreadStore = create<ThreadStore>()(
  immer((set) => ({
    // Messages
    messages: [],
    isLoadingMessages: false,

    // Current board
    currentBoardId: 'money',
    currentBoard: undefined,

    // All boards
    boards: [],
    isLoadingBoards: false,

    // UI state
    showComposer: true,

    // Actions
    setCurrentBoardId: (id: string) =>
      set((state) => {
        state.currentBoardId = id;
      }),

    setMessages: (messages: ThreadMessage[]) =>
      set((state) => {
        state.messages = messages;
      }),

    addMessage: (message: ThreadMessage) =>
      set((state) => {
        state.messages.unshift(message);
      }),

    setBoards: (boards: Board[]) =>
      set((state) => {
        state.boards = boards;
      }),

    setCurrentBoard: (board: Board) =>
      set((state) => {
        state.currentBoard = board;
      }),

    setLoadingMessages: (loading: boolean) =>
      set((state) => {
        state.isLoadingMessages = loading;
      }),

    setLoadingBoards: (loading: boolean) =>
      set((state) => {
        state.isLoadingBoards = loading;
      }),

    setShowComposer: (show: boolean) =>
      set((state) => {
        state.showComposer = show;
      }),
  }))
);

export function useResetThreadStore() {
  return () =>
    useThreadStore.setState({
      messages: [],
      isLoadingMessages: false,
      currentBoardId: 'money',
      currentBoard: undefined,
      boards: [],
      isLoadingBoards: false,
      showComposer: true,
    });
}
