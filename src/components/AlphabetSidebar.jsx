import { useRef } from "react";
export default function AlphabetSidebar({ letters, show, scrollToLetter }) {
  const alphaRef = useRef(null);
  const handleTouch = (clientY) => {
    const container = alphaRef.current;
    if (!container) return;
    const buttons = Array.from(container.querySelectorAll("button[data-letter]"));
    const btn = buttons.find((b) => {
      const r = b.getBoundingClientRect();
      return clientY >= r.top && clientY <= r.bottom;
    });
    if (btn) scrollToLetter(btn.dataset.letter);
  };
  return (
    <div
      ref={alphaRef}
      className={`fixed right-2 top-1/4 flex flex-col items-center select-none z-40 transition-opacity duration-500 ease-out ${show ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      onTouchStart={(e) => handleTouch(e.touches[0].clientY)}
      onTouchMove={(e) => { e.preventDefault(); handleTouch(e.touches[0].clientY); }}
    >
      {letters.map((l) => (
        <button key={l} data-letter={l} className="text-gray-400 text-sm py-0.5 hover:text-black active:scale-110" onMouseDown={() => scrollToLetter(l)}>
          {l}
        </button>
      ))}
    </div>
  );
}
