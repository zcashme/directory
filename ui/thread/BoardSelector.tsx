'use client';

import { Board } from '@/lib/thread/types';
import { useState } from 'react';
import Button from '@/ui/common/buttons/Button';
import Card from '@/ui/common/layout/Card';

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
    <div className="md:hidden mb-4 relative">
      <Button
        variant="secondary"
        size="md"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-start"
      >
        <span className="truncate">{currentBoard?.name || 'Select Board'}</span>
      </Button>

      {isOpen && (
        <Card padding="none" shadow="md" rounded="lg" className="absolute top-12 left-0 right-0 z-50 max-h-72 overflow-y-auto">
          <div className="divide-y divide-black/30">
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => handleSelect(board.id)}
                className={`w-full text-left px-4 py-3 text-sm transition ${
                  currentBoardId === board.id
                    ? 'bg-[var(--color-brand-blue)]/10 text-[var(--color-brand-blue)] font-medium'
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
        </Card>
      )}
    </div>
  );
}
