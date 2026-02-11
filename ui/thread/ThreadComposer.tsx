'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { THREAD_CONSTANTS } from '@/lib/thread/constants';
import { Card, Button } from '@/ui/common';

interface ThreadComposerProps {
  userAvatar?: string;
  userName: string;
  onSubmit: (content: string) => Promise<void>;
  disabled?: boolean;
  boardName?: string;
}

export function ThreadComposer({ userAvatar, userName, onSubmit, disabled = false, boardName = 'Board' }: ThreadComposerProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const characterCount = content.length;
  const maxLength = THREAD_CONSTANTS.MAX_MESSAGE_LENGTH;
  const isOverLimit = characterCount > maxLength;
  const isValid = characterCount > 0 && !isOverLimit;

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content);
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Failed to submit message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <Card padding="md" rounded="2xl" className="mb-4">
      {/* Header with avatar */}
      <div className="flex items-center gap-3 mb-3">
        {userAvatar ? (
          <Image
            src={userAvatar}
            alt={userName}
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-600">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <span className="font-semibold text-sm text-gray-900">{userName}</span>
          <p className="text-xs text-gray-500">Send to z/{boardName}</p>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What's on your mind?"
        disabled={disabled || isSubmitting}
        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent resize-none min-h-[100px] disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {/* Footer with counter and button */}
      <div className="flex items-center justify-between mt-3">
        <div className="text-xs">
          {isOverLimit ? (
            <span className="text-red-600 font-medium">
              {characterCount} / {maxLength} characters (Over limit)
            </span>
          ) : (
            <span className="text-gray-500">
              {characterCount} / {maxLength} characters
            </span>
          )}
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? 'Posting...' : 'Post'}
        </Button>
      </div>

      {/* Help text */}
      <p className="text-xs text-gray-400 mt-2">Tip: Press Ctrl+Enter to submit</p>
    </Card>
  );
}
