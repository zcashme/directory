'use client';

import { Board } from '@/lib/thread/types';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/ui/common';

interface SidebarNavProps {
  boards: Board[];
  currentBoardId: string;
  onBoardSelect: (boardId: string) => void;
  onCreateBoard: () => void;
  isLoading?: boolean;
}

export function SidebarNav({
  boards,
  currentBoardId,
  onBoardSelect,
  onCreateBoard,
  isLoading = false,
}: SidebarNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleBoardSelect = (boardId: string) => {
    onBoardSelect(boardId);
    router.push(`/thread/${boardId}`);
  };

  const isActiveBoard = (boardId: string) => {
    // Check if the current board matches the pathname
    return pathname === `/thread/${boardId}` || (pathname === '/thread' && boardId === currentBoardId);
  };

  return (
    <aside className="w-64 border-r border-black/30 bg-[#faf6ed] h-full overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-black/30">
        <h2 className="text-2xl font-bold text-gray-900">Threads</h2>
      </div>

      {/* Create Board Button */}
      <div className="p-4 border-b border-black/30">
        <Button
          variant="primary"
          size="md"
          onClick={onCreateBoard}
          className="w-full"
        >
          + Create Board
        </Button>
      </div>

      {/* Boards List */}
      <div className="flex-1 overflow-y-auto p-2">
        <p className="px-2 py-2 text-xs font-semibold text-gray-600 uppercase">Boards</p>

        {isLoading ? (
          <div className="space-y-2 px-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-8 bg-gray-200 rounded animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => handleBoardSelect(board.id)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                  isActiveBoard(board.id)
                    ? 'bg-blue-100 border-l-4 border-blue-700 text-blue-700 font-medium'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="truncate"># {board.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
