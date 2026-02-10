'use client';

import { Board } from '@/lib/thread/types';
import { formatDistanceToNow } from '@/lib/thread/utils';

interface BoardHeaderProps {
  board: Board;
}

export function BoardHeader({ board }: BoardHeaderProps) {
  const createdDate = formatDistanceToNow(new Date(board.created_at));

  return (
    <div className="bg-white border-b border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
      {/* Board Name */}
      <h1 className="text-4xl font-bold text-gray-900 mb-2">
        📌 {board.name}
      </h1>

      {/* Description and Meta */}
      <div className="space-y-2">
        {board.description && (
          <p className="text-gray-700 text-sm leading-relaxed">
            {board.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-600 pt-2">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            {board.member_count || 0} member{board.member_count !== 1 ? 's' : ''}
          </span>
          <span>Created {createdDate}</span>
        </div>
      </div>
    </div>
  );
}
