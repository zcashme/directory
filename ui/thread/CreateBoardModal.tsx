'use client';

import { useState } from 'react';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (boardName: string, boardDescription: string) => Promise<void>;
  isLoading?: boolean;
}

export function CreateBoardModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: CreateBoardModalProps) {
  const [boardName, setBoardName] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!boardName.trim()) {
      setError('Board name is required');
      return;
    }

    if (boardName.length < 2) {
      setError('Board name must be at least 2 characters');
      return;
    }

    if (boardName.length > 50) {
      setError('Board name must be less than 50 characters');
      return;
    }

    try {
      await onSubmit(boardName.trim(), boardDescription.trim());
      setBoardName('');
      setBoardDescription('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create board');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Create New Board</h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Board Name */}
          <div>
            <label htmlFor="boardName" className="block text-sm font-medium text-gray-700 mb-2">
              Board Name
            </label>
            <input
              id="boardName"
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              placeholder="e.g., crypto, gaming, music"
              maxLength={50}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              {boardName.length} / 50 characters
            </p>
          </div>

          {/* Board Description */}
          <div>
            <label htmlFor="boardDescription" className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              id="boardDescription"
              value={boardDescription}
              onChange={(e) => setBoardDescription(e.target.value)}
              placeholder="What is this board about?"
              maxLength={200}
              rows={3}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              {boardDescription.length} / 200 characters
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Creating...' : 'Create Board'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
