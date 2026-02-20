"use client";

import { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import type { Profile } from "@/lib/profile/types";
import ProfileVerification from "./ProfileVerification";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

interface VerifyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Partial<Profile>;
}

export default function VerifyProfileModal({ isOpen, onClose, profile }: VerifyProfileModalProps) {
  const [generateQrTrigger, setGenerateQrTrigger] = useState(0);
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setGenerateQrTrigger((prev) => prev + 1);
  }, [isOpen]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-center px-4 items-start sm:items-center pt-[10vh] sm:pt-0 overflow-y-auto">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-md bg-white/85 backdrop-blur-md rounded-2xl shadow-xl border border-black/30 animate-in fade-in zoom-in-95 duration-200 my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
          <h2 className="text-lg font-semibold text-gray-800">Verify Profile</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
            aria-label="Close"
          >
            <XIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {profile && (
            <ProfileVerification
              profile={profile as Profile}
              generateQrTrigger={generateQrTrigger}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
