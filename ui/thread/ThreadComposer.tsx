'use client';

import { SimpleThreadComposer } from './SimpleThreadComposer';

interface ThreadComposerProps {
  onSubmit: (content: string) => Promise<void>;
  disabled?: boolean;
  boardName?: string;
}

/**
 * Thread Message Composer
 * Simple text-based message composer with emoji autocomplete
 */
export function ThreadComposer({ onSubmit, disabled = false, boardName = 'Board' }: ThreadComposerProps) {
  return (
    <SimpleThreadComposer
      onSubmit={onSubmit}
      disabled={disabled}
      boardName={boardName}
    />
  );
}
