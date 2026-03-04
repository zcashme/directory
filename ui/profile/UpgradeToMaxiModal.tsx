"use client";

import ReactDOM from "react-dom";

const FEATURES = [
  "Priority placement in the directory",
  "Gold verified badge on your profile",
  "Enhanced referral commission rates",
  "Custom profile themes",
];

interface UpgradeToMaxiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeToMaxiModal({ isOpen, onClose }: UpgradeToMaxiModalProps) {
  if (!isOpen || typeof document === "undefined") return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-center px-4 items-start sm:items-center pt-[10vh] sm:pt-0 overflow-y-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white/85 backdrop-blur-md rounded-2xl shadow-xl border border-black/30 animate-in fade-in zoom-in-95 duration-200 my-4">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="text-3xl mb-2">★</div>
            <h2 className="text-xl font-bold text-gray-900">Upgrade to Maxi</h2>
          </div>

          <div className="space-y-3 mb-6">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-start gap-3 text-sm">
                <span className="text-[var(--color-brand-blue)] mt-0.5">✓</span>
                <span className="text-gray-700">{f}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 pt-4 text-center">
            <div className="mb-4">
              <span className="text-2xl font-bold text-gray-900">1 ZEC</span>
              <span className="text-sm text-gray-500 ml-1">one-time</span>
            </div>
            <button
              onClick={() => { /* TODO: payment flow */ }}
              className="w-full py-3 rounded-xl bg-[var(--color-brand-blue)] text-white font-semibold hover:bg-[var(--color-brand-blue)]/90 transition-colors"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
