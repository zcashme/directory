import { useEffect, useState } from "react";

export default function AlphabetSidebar({ letters, activeLetter, scrollToLetter, showDirectory }) {
  const [visible, setVisible] = useState(false);
  const [hasShownOnce, setHasShownOnce] = useState(false);

  // Show briefly on first directory load
  useEffect(() => {
    if (!showDirectory || hasShownOnce) return;
    setHasShownOnce(true);
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [hasShownOnce, showDirectory]);

  // Show again on scroll when directory is visible
  useEffect(() => {
    if (!showDirectory) return;
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
  }, [showDirectory]);

  if (!showDirectory) return null; // hide completely when not in directory

  return (
    <div
      className={`fixed right-2 top-1/2 -translate-y-1/2 flex flex-col items-center space-y-1 transition-opacity duration-700 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {letters.map((letter) => (
        <button
          key={letter}
          onClick={() => scrollToLetter(letter)}
          className={`w-6 h-6 text-xs font-semibold rounded-full flex items-center justify-center transition-all duration-200 ${
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
