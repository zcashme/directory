'use client';

import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, FormField, Button, Input, TextArea } from '@/ui/common';

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
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader title="Create New Board" onClose={onClose} />

      <ModalBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Board Name */}
          <FormField
            label="Board Name"
            htmlFor="boardName"
            hint={`${boardName.length} / 50 characters`}
            required
          >
            <Input
              id="boardName"
              type="text"
              value={boardName}
              onChange={setBoardName}
              placeholder="e.g., crypto, gaming, music"
              maxLength={50}
              disabled={isLoading}
            />
          </FormField>

          {/* Board Description */}
          <FormField
            label="Description (optional)"
            htmlFor="boardDescription"
            hint={`${boardDescription.length} / 200 characters`}
          >
            <TextArea
              id="boardDescription"
              value={boardDescription}
              onChange={setBoardDescription}
              placeholder="What is this board about?"
              maxLength={200}
              rows={3}
              disabled={isLoading}
            />
          </FormField>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </form>
      </ModalBody>

      <ModalFooter>
        <Button
          variant="secondary"
          size="md"
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={handleSubmit}
          disabled={isLoading || !boardName.trim()}
        >
          {isLoading ? 'Creating...' : 'Create Board'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
