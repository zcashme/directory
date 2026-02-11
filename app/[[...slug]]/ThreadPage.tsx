'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ThreadBoard } from '@/ui/thread/ThreadBoard';
import { ThreadMessage, Board } from '@/lib/thread/types';
import {
  fetchBoardsAction,
  fetchMessagesAction,
  postMessageAction,
  createBoardAction,
} from '@/lib/thread/actions';
import { THREAD_CONSTANTS } from '@/lib/thread/constants';

interface ThreadPageProps {
  boardSlug: string;
  initialMessages?: ThreadMessage[];
  initialBoards?: Board[];
}

export default function ThreadPage({
  boardSlug,
  initialMessages = [],
  initialBoards = [],
}: ThreadPageProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [boards, setBoards] = useState<Board[]>(initialBoards);
  const [currentBoardId, setCurrentBoardId] = useState<string>('');
  const [isLoadingInitial, setIsLoadingInitial] = useState(!initialBoards.length);
  const [messageOffset, setMessageOffset] = useState(0);

  // Initialize boards on mount and find board by slug
  useEffect(() => {
    const initializeBoards = async () => {
      if (boards.length === 0) {
        const result = await fetchBoardsAction();
        if (result.success && result.data) {
          setBoards(result.data);
          // Find board matching the slug
          const board = result.data.find((b) => b.slug === boardSlug);
          if (board) {
            setCurrentBoardId(board.id);
          }
        }
      } else {
        // Boards already loaded, find matching board
        const board = boards.find((b) => b.slug === boardSlug);
        if (board) {
          setCurrentBoardId(board.id);
        }
      }
      setIsLoadingInitial(false);
    };

    initializeBoards();
  }, [boardSlug, boards]);

  // Load messages when board changes
  useEffect(() => {
    if (!currentBoardId) return;

    const loadMessages = async () => {
      const result = await fetchMessagesAction(
        currentBoardId,
        THREAD_CONSTANTS.MESSAGES_PER_PAGE,
        0
      );
      if (result.success && result.data) {
        setMessages(result.data);
        setMessageOffset(0);
      }
    };

    loadMessages();
  }, [currentBoardId]);

  const handlePostMessage = async (
    content: string,
    boardId: string,
    walletAddress?: string,
    otpToken?: string
  ) => {
    const result = await postMessageAction(
      content,
      boardId,
      walletAddress,
      otpToken
    );
    if (result.success && result.data) {
      const messagesResult = await fetchMessagesAction(
        boardId,
        THREAD_CONSTANTS.MESSAGES_PER_PAGE,
        0
      );
      if (messagesResult.success && messagesResult.data) {
        setMessages(messagesResult.data);
        setMessageOffset(0);
      }
    } else {
      throw new Error(result.error || 'Failed to post message');
    }
  };

  const handleLoadMoreMessages = async (boardId: string) => {
    const nextOffset = messageOffset + THREAD_CONSTANTS.MESSAGES_PER_PAGE;
    const result = await fetchMessagesAction(
      boardId,
      THREAD_CONSTANTS.MESSAGES_PER_PAGE,
      nextOffset
    );
    if (result.success && result.data) {
      setMessages((prev) => [...prev, ...result.data!]);
      setMessageOffset(nextOffset);
    }
  };

  const handleCreateBoard = async (
    name: string,
    description: string,
    walletAddress?: string,
    otpToken?: string
  ) => {
    const result = await createBoardAction(
      name,
      description,
      walletAddress,
      otpToken
    );
    if (result.success && result.data) {
      setBoards((prev) => [...prev, result.data!]);
      // Navigate to new board
      router.push(`/${result.data.slug}`);
    } else {
      throw new Error(result.error || 'Failed to create board');
    }
  };

  const handleBoardSelect = (boardId: string) => {
    const board = boards.find((b) => b.id === boardId);
    if (board) {
      router.push(`/${board.slug}`);
    }
  };

  if (isLoadingInitial || !currentBoardId) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-32 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
      </div>
    );
  }

  return (
    <ThreadBoard
      initialMessages={messages}
      initialBoards={boards}
      initialBoardId={currentBoardId}
      onPostMessage={handlePostMessage}
      onLoadMoreMessages={handleLoadMoreMessages}
      onCreateBoard={handleCreateBoard}
      onBoardSelect={handleBoardSelect}
    />
  );
}
