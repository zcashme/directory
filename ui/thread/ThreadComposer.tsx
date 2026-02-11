'use client';

import { ZcashVerificationComposer } from './ZcashVerificationComposer';

interface ThreadComposerProps {
  onSubmit: (content: string, walletAddress?: string, otpToken?: string) => Promise<void>;
  disabled?: boolean;
  boardName?: string;
}

/**
 * Thread Message Composer
 * Now uses Zcash-based verification instead of traditional login
 * Users must verify with either:
 * - Anonymous mode: Send Zcash + OTP verification
 * - Verified mode: Send from zcash.me wallet + OTP verification
 */
export function ThreadComposer({ onSubmit, disabled = false, boardName = 'Board' }: ThreadComposerProps) {
  return (
    <ZcashVerificationComposer
      onSubmit={onSubmit}
      disabled={disabled}
      boardName={boardName}
    />
  );
}
