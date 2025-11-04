import { useEffect, useState } from "react";

/**
 * Toast: slides in from right → center → fades & slides out right
 */
export default function Toast({
  message,
  show,
  duration = 5000,
  onClose,
}) {
  const [render, setRender] = useState(false);

  useEffect(() => {
    if (show) {
      setRender(true);
      const timer = setTimeout(() => {
        // wait until animation completes before unmounting
        setRender(false);
        onClose?.();
      }, duration + 600);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!render) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 bg-black-900 text-red text-sm px-4 py-2 rounded-lg shadow-lg pointer-events-none animate-toastSlideRight"
    >
      {message}
      <style>{`
        /* Slide in from right → hold → fade & slide out right */
        @keyframes toastSlideRight {
          0%   { opacity: 0; transform: translateX(80px); }
          10%  { opacity: 1; transform: translateX(0); }
          85%  { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(80px); }
        }

        .animate-toastSlideRight {
          animation: toastSlideRight ${duration + 600}ms ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}
