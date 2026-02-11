'use client';

import { useState } from 'react';
import { Board, ThreadMessage } from '@/lib/thread/types';
import { SidebarNav } from './SidebarNav';
import { BoardHeader } from './BoardHeader';
import { ThreadComposer } from './ThreadComposer';
import { ThreadFeed } from './ThreadFeed';
import { CreateBoardModal } from './CreateBoardModal';
import { BoardSelector } from './BoardSelector';

interface ThreadBoardProps {
  initialMessages: ThreadMessage[];
  initialBoards: Board[];
  initialBoardId: string;
  userAvatar?: string;
  userName: string;
  isLoggedIn: boolean;
  onPostMessage: (content: string, boardId: string) => Promise<void>;
  onLoadMoreMessages: (boardId: string) => Promise<void>;
  onCreateBoard: (name: string, description: string) => Promise<void>;
  onBoardSelect: (boardId: string) => void;
}

export function ThreadBoard({
  initialMessages,
  initialBoards,
  initialBoardId,
  userAvatar,
  userName,
  isLoggedIn,
  onPostMessage,
  onLoadMoreMessages,
  onCreateBoard,
  onBoardSelect,
}: ThreadBoardProps) {
  const [currentBoardId, setCurrentBoardId] = useState(initialBoardId);
  const [boards] = useState(initialBoards);
  const [messages, setMessages] = useState(initialMessages);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);

  const currentBoard = boards.find((b) => b.id === currentBoardId);

  const handleBoardSelect = (boardId: string) => {
    setCurrentBoardId(boardId);
    setMessages([]); // Clear messages when switching boards
    setIsLoadingMessages(true);
    onBoardSelect(boardId);
    setIsLoadingMessages(false);
  };

  const handlePostMessage = async (content: string) => {
    try {
      await onPostMessage(content, currentBoardId);
      // Refresh messages
      setMessages([]);
      setIsLoadingMessages(true);
    } catch (error) {
      console.error('Failed to post message:', error);
      throw error;
    }
  };

  const handleCreateBoard = async (name: string, description: string) => {
    setIsCreatingBoard(true);
    try {
      await onCreateBoard(name, description);
      // Refresh boards and show the new board
      setShowCreateBoardModal(false);
    } catch (error) {
      console.error('Failed to create board:', error);
      throw error;
    } finally {
      setIsCreatingBoard(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#faf6ed]">
      {/* Sidebar - Desktop Only */}
      <div className="hidden md:flex md:flex-col sticky top-0 h-screen">
        <SidebarNav
          boards={boards}
          currentBoardId={currentBoardId}
          onBoardSelect={handleBoardSelect}
          onCreateBoard={() => setShowCreateBoardModal(true)}
          userAvatar={userAvatar}
          userName={userName}
          isLoading={false}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col bg-[#faf6ed]">
        {/* Mobile Board Selector */}
        <div className="md:hidden sticky top-0 bg-[#faf6ed] z-40 border-b border-black/30 px-4 py-3">
          <BoardSelector
            boards={boards}
            currentBoardId={currentBoardId}
            onBoardSelect={handleBoardSelect}
          />
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-8">
            {/* Board Header */}
            {currentBoard && <BoardHeader board={currentBoard} />}

            {/* Message Composer */}
            {isLoggedIn ? (
              <ThreadComposer
                userAvatar={userAvatar}
                userName={userName}
                onSubmit={handlePostMessage}
                disabled={isLoadingMessages}
                boardName={currentBoard?.name || 'Board'}
              />
            ) : (
              <div className="bg-white/85 border border-black/30 rounded-lg p-4 shadow-sm mb-4">
                <p className="text-gray-600 text-sm">
                  <a href="/login" className="text-blue-700 hover:underline font-medium">
                    Sign in
                  </a>{' '}
                  to participate in the discussion.
                </p>
              </div>
            )}

            {/* Message Feed */}
            <ThreadFeed
              messages={messages}
              boardId={currentBoardId}
              isLoading={isLoadingMessages}
              onLoadMore={() => onLoadMoreMessages(currentBoardId)}
            />
          </div>
        </div>
      </main>

      {/* Create Board Modal */}
      <CreateBoardModal
        isOpen={showCreateBoardModal}
        onClose={() => setShowCreateBoardModal(false)}
        onSubmit={handleCreateBoard}
        isLoading={isCreatingBoard}
      />
    </div>
  );
}
