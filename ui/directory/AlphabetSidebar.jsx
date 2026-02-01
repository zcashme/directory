import { useEffect, useRef, useState } from "react";

export default function AlphabetSidebar({ letters, activeLetter, onSelect, show }) {
  const [visible, setVisible] = useState(false);
  const [hasShownOnce, setHasShownOnce] = useState(false);
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Show briefly on first directory load
  useEffect(() => {
    if (!show) {
      setVisible(false);
      return;
    }
    if (!hasShownOnce) {
      setHasShownOnce(true);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [show, hasShownOnce]);

  // Show again on scroll
  useEffect(() => {
    if (!show) return;
    let scrollTimeout;
    const handleScroll = () => {
      setVisible(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => setVisible(false), 2000);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [show]);

  // Helper: find letter based on pointer position
  const getLetterFromEvent = (e) => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const relativeY = y - rect.top;
    const index = Math.floor((relativeY / rect.height) * letters.length);
    return letters[Math.max(0, Math.min(index, letters.length - 1))];
  };

  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    const letter = getLetterFromEvent(e);
    if (letter) onSelect(letter);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    e.preventDefault?.();
    const letter = getLetterFromEvent(e);
    if (letter) onSelect(letter);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      className={`fixed right-2 top-1/2 -translate-y-1/2 flex flex-col items-center transition-opacity duration-700 select-none ${
        visible && show ? "opacity-100" : "opacity-0"
      }`}
      style={{
        touchAction: "none",
        padding: "0.5rem 0",     // reduce total height
        height: "70vh",          // shrink vertical range
        justifyContent: "center" // vertical centering
      }}
    >
      {letters.map((letter) => (
        <button
          key={letter}
          onClick={() => onSelect(letter)}
          className={`w-6 h-6 text-xs font-semibold rounded-full flex items-center justify-center transition-all duration-200 mb-[2px] ${
            activeLetter === letter
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:text-blue-600"
          }`}
        >
          {letter}
        </button>
      ))}
    </div>
  );
}
