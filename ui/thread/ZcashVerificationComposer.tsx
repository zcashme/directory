'use client';

import { useState, useRef, useEffect } from 'react';
import { THREAD_CONSTANTS } from '@/lib/thread/constants';
import { Card, Button, Input } from '@/ui/common';
import { OtpInput } from '@/ui/verification/OtpInput';

interface ZcashVerificationComposerProps {
  onSubmit: (content: string, walletAddress: string, otpToken: string) => Promise<void>;
  disabled?: boolean;
  boardName?: string;
}

type VerificationMode = 'anonymous' | 'verified' | null;

const ZCASH_PAYMENT_ADDRESS = 'z1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqg4an2x'; // TODO: Replace with actual payment address

export function ZcashVerificationComposer({
  onSubmit,
  disabled = false,
}: ZcashVerificationComposerProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationMode, setVerificationMode] = useState<VerificationMode>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const characterCount = content.length;
  const maxLength = THREAD_CONSTANTS.MAX_MESSAGE_LENGTH;
  const isOverLimit = characterCount > maxLength;
  const isValid = characterCount > 0 && !isOverLimit;
  const isVerified = walletAddress.trim() && otpToken.trim();

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [content]);

  const handleSubmit = async () => {
    if (!isValid || isSubmitting || !isVerified) return;

    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit(content, walletAddress, otpToken);
      setContent('');
      setWalletAddress('');
      setOtpToken('');
      setVerificationMode(null);
      setShowVerification(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to submit message';
      setError(errorMsg);
      console.error('Failed to submit message:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey && isVerified) {
      handleSubmit();
    }
  };

  const selectMode = (mode: VerificationMode) => {
    setVerificationMode(mode);
    setShowVerification(true);
    setError('');
    setWalletAddress('');
    setOtpToken('');
  };

  return (
    <Card padding="md" rounded="2xl" className="mb-4">
      {/* Mode Selection - Only show if no mode selected */}
      {!verificationMode && !showVerification && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-gray-900 mb-3">How would you like to post?</p>
          <div className="flex gap-3">
            <button
              onClick={() => selectMode('anonymous')}
              className="flex-1 px-4 py-2 bg-[#faf6ed] border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition"
            >
              Anonymous (Zcash Payment)
            </button>
            <button
              onClick={() => selectMode('verified')}
              className="flex-1 px-4 py-2 bg-[#faf6ed] border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition"
            >
              Verified (zcash.me Wallet)
            </button>
          </div>
        </div>
      )}

      {/* Anonymous Mode */}
      {verificationMode === 'anonymous' && showVerification && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Anonymous Post</p>
              <p className="text-xs text-gray-600 mt-1">Send Zcash to verify your message</p>
            </div>
            <button
              onClick={() => {
                setVerificationMode(null);
                setShowVerification(false);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Change
            </button>
          </div>

          <div className="space-y-3">
            {/* Payment Address */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Send Zcash to this address:
              </label>
              <div className="flex gap-2">
                <div className="flex-1 rounded-2xl border border-black/30 bg-gray-100 px-3 py-2 text-sm">
                  <code className="text-gray-600 break-all">{ZCASH_PAYMENT_ADDRESS}</code>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(ZCASH_PAYMENT_ADDRESS);
                  }}
                  className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* OTP Input */}
            <OtpInput
              id="anon-otp"
              label="Verification Code"
              value={otpToken}
              onChange={setOtpToken}
              placeholder="Enter 6-digit OTP"
              autoFocus
            />

            <p className="text-xs text-gray-500">After sending Zcash, you will receive an OTP code via email or your preferred method.</p>
          </div>
        </div>
      )}

      {/* Verified Mode */}
      {verificationMode === 'verified' && showVerification && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Verified Post</p>
              <p className="text-xs text-gray-600 mt-1">Post from your zcash.me wallet</p>
            </div>
            <button
              onClick={() => {
                setVerificationMode(null);
                setShowVerification(false);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Change
            </button>
          </div>

          <div className="space-y-3">
            {/* Wallet Address Input */}
            <Input
              type="text"
              value={walletAddress}
              onChange={(val) => {
                setWalletAddress(val);
                setError('');
              }}
              placeholder="your.zcash.me or z-address"
              disabled={isSubmitting}
            />

            {/* OTP Input */}
            <OtpInput
              id="verified-otp"
              label="Verification Code"
              value={otpToken}
              onChange={setOtpToken}
              placeholder="Enter 6-digit OTP"
              autoFocus
            />

            <p className="text-xs text-gray-500">Verify your identity with OTP to post as a verified user.</p>
          </div>
        </div>
      )}

      {/* Message Content */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What's on your mind?"
        disabled={disabled || isSubmitting}
        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-transparent resize-none min-h-[100px] disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {/* Error Message */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

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
          disabled={!isValid || isSubmitting || !isVerified}
        >
          {isSubmitting ? 'Posting...' : 'Post'}
        </Button>
      </div>

      {/* Help text */}
      <p className="text-xs text-gray-400 mt-2">
        {verificationMode ? 'Fill in your verification details above' : 'Select how you want to post'}
      </p>
    </Card>
  );
}
