'use client';

import { Board } from '@/lib/thread/types';
import { useState } from 'react';

interface BoardSelectorProps {
  boards: Board[];
  currentBoardId: string;
  onBoardSelect: (boardId: string) => void;
}

export function BoardSelector({ boards, currentBoardId, onBoardSelect }: BoardSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentBoard = boards.find((b) => b.id === currentBoardId);

  const handleSelect = (boardId: string) => {
    onBoardSelect(boardId);
    setIsOpen(false);
  };

  return (
    <div className="md:hidden mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-left text-sm font-medium text-gray-900 hover:bg-gray-50 transition"
      >
        <span className="truncate">📌 {currentBoard?.name || 'Select Board'}</span>
      </button>

      {isOpen && (
        <div className="absolute top-12 left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => handleSelect(board.id)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 transition ${
                currentBoardId === board.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span># {board.name}</span>
                {currentBoardId === board.id && <span className="ml-auto">✓</span>}
              </div>
              {board.description && (
                <p className="text-xs text-gray-500 mt-1 truncate">{board.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
