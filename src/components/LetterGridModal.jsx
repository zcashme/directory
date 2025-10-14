export default function LetterGridModal({ letters, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="grid grid-cols-5 gap-4 text-white text-4xl font-bold text-center select-none" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => {
            onClose();
            setTimeout(() => {
              const input = document.querySelector('input[placeholder^="search"]');
              if (input) input.focus();
            }, 150);
          }}
          className="hover:text-yellow-400 active:scale-125 transition-transform"
          title="Search"
        >⌕</button>
        {letters.map((l) => (
          <button key={l} onClick={() => { onClose(); setTimeout(() => onSelect(l), 200); }} className="hover:text-yellow-400 active:scale-125 transition-transform">
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
