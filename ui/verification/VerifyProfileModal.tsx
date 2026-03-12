"use client";

import { useCallback, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import type { Profile } from "@/lib/profile/types";
import ProfileVerification from "./ProfileVerification";

interface VerifyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Partial<Profile>;
}

export default function VerifyProfileModal({ isOpen, onClose, profile }: VerifyProfileModalProps) {
  const [generateQrTrigger, setGenerateQrTrigger] = useState(0);
  const [isPreparingVerification, setIsPreparingVerification] = useState(false);
  const handleClose = useCallback(() => {
    setIsPreparingVerification(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      setIsPreparingVerification(false);
      return;
    }
    setIsPreparingVerification(true);
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

      <div className="relative w-full max-w-[340px] bg-white/85 backdrop-blur-md rounded-2xl shadow-xl border border-black/30 animate-in fade-in zoom-in-95 duration-200 my-4">
        {isPreparingVerification && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          >
            <div className="h-[4px] w-1/3 overflow-hidden rounded-full bg-green-200/60">
              <div className="verify-progress-line h-full w-[42%] bg-green-600" />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-5 min-h-[220px] grid place-items-center">
          {profile && (
            <ProfileVerification
              profile={profile as Profile}
              generateQrTrigger={generateQrTrigger}
              onClose={handleClose}
              onLoadingStateChange={setIsPreparingVerification}
            />
          )}
        </div>
      </div>
      <style jsx>{`
        .verify-progress-line {
          animation: verify-progress-slide 1.1s ease-in-out infinite;
        }

        @keyframes verify-progress-slide {
          0% {
            transform: translateX(-120%);
          }
          50% {
            transform: translateX(90%);
          }
          100% {
            transform: translateX(235%);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
