'use client';

import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, FormField, Button, Input, TextArea } from '@/ui/common';
import { OtpInput } from '@/ui/verification/OtpInput';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (boardName: string, boardDescription: string, walletAddress?: string, otpToken?: string) => Promise<void>;
  isLoading?: boolean;
}

const ZCASH_PAYMENT_ADDRESS = 'z1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqg4an2x'; // TODO: Replace with actual payment address

export function CreateBoardModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: CreateBoardModalProps) {
  const [boardName, setBoardName] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [verificationMode, setVerificationMode] = useState<'anonymous' | 'verified' | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [otpToken, setOtpToken] = useState('');
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

    // Check verification
    if (!otpToken.trim() || !walletAddress.trim()) {
      setError('OTP verification required to create boards');
      return;
    }

    try {
      await onSubmit(boardName.trim(), boardDescription.trim(), walletAddress, otpToken);
      setBoardName('');
      setBoardDescription('');
      setWalletAddress('');
      setOtpToken('');
      setVerificationMode(null);
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
              disabled={isLoading || !!verificationMode}
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
              disabled={isLoading || !!verificationMode}
            />
          </FormField>

          {/* Verification Section */}
          {!verificationMode && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-gray-900 mb-3">How would you like to verify?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVerificationMode('anonymous')}
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition"
                >
                  Anonymous (Zcash)
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationMode('verified')}
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition"
                >
                  Verified (Wallet)
                </button>
              </div>
            </div>
          )}

          {/* Anonymous Verification */}
          {verificationMode === 'anonymous' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm font-semibold text-gray-900">Anonymous Verification</p>
                <button
                  type="button"
                  onClick={() => {
                    setVerificationMode(null);
                    setWalletAddress('');
                    setOtpToken('');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Send Zcash to:
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-2xl border border-black/30 bg-gray-100 px-3 py-2 text-sm">
                    <code className="text-gray-600 break-all">{ZCASH_PAYMENT_ADDRESS}</code>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(ZCASH_PAYMENT_ADDRESS)}
                    className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-medium transition"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <OtpInput
                id="anon-board-otp"
                label="OTP Code"
                value={otpToken}
                onChange={setOtpToken}
                placeholder="Enter 6-digit OTP"
                autoFocus
              />
            </div>
          )}

          {/* Verified Verification */}
          {verificationMode === 'verified' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm font-semibold text-gray-900">Verified Verification</p>
                <button
                  type="button"
                  onClick={() => {
                    setVerificationMode(null);
                    setWalletAddress('');
                    setOtpToken('');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Change
                </button>
              </div>

              <Input
                type="text"
                value={walletAddress}
                onChange={setWalletAddress}
                placeholder="your.zcash.me or z-address"
                disabled={isLoading}
              />

              <OtpInput
                id="verified-board-otp"
                label="OTP Code"
                value={otpToken}
                onChange={setOtpToken}
                placeholder="Enter 6-digit OTP"
                autoFocus
              />
            </div>
          )}

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
          disabled={isLoading || !boardName.trim() || !otpToken.trim() || !walletAddress.trim()}
        >
          {isLoading ? 'Creating...' : 'Create Board'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
