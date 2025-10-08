import { useEffect } from "react";

/**
 * Toast: simple disappearing notification
 * Props:
 *   message  – text to display
 *   show     – boolean to toggle visibility
 *   duration – milliseconds before fade-out (default 4000)
 *   onClose  – callback after fade-out
 */
export default function Toast({ message, show, duration = 4000, onClose }) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(timer);
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg animate-fadeInOut pointer-events-none">
      {message}
      <style>
        {`
          @keyframes fadeInOut {
            0%,100%{opacity:0;transform:translateY(10px)}
            10%,90%{opacity:1;transform:translateY(0)}
          }
          .animate-fadeInOut{animation:fadeInOut ${duration}ms ease-in-out}
        `}
      </style>
    </div>
  );
}
