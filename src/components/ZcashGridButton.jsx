import React, { useState, useRef, useEffect } from 'react';
import directoryIcon from '../assets/icons/minimalist/directory.svg';
import forumIcon from '../assets/icons/minimalist/forum.svg';
import mapsIcon from '../assets/icons/minimalist/maps.svg';
import viewkeyIcon from '../assets/icons/minimalist/viewkey.svg';
import newsIcon from '../assets/icons/minimalist/news.svg';

const apps = [
  { name: 'Directory', icon: directoryIcon},
  { name: 'Forum', icon: forumIcon, url: 'https://forum.zcash.me/' },
  { name: 'Maps', icon: mapsIcon, url: 'https://maps.zcash.me/' }, 
  { name: 'Viewkey', icon: viewkeyIcon, url: 'https://view.zcash.me/' },
  { name: 'SendMany', icon: newsIcon},
];

export default function ZcashGridButton({ className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={className || "fixed top-3 right-4 z-50"} ref={containerRef}>
      {/* Grid Button (Trigger) - Scaled Down */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-full hover:bg-black/5 transition-colors duration-200 focus:outline-none"
        aria-label="Zcash Apps"
        title="Zcash Apps"
      >
        <svg
          className="w-7 h-7 text-[var(--color-primary)]"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M6,8c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM12,20c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM6,20c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM6,14c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM12,14c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM16,6c0,1.1 0.9,2 2,2s2,-0.9 2,-2 -0.9,-2 -2,-2 -2,0.9 -2,2zM12,8c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM18,14c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2zM18,20c1.1,0 2,-0.9 2,-2s-0.9,-2 -2,-2 -2,0.9 -2,2 0.9,2 2,2z"></path>
        </svg>
      </button>

      {/* App Tray (Dropdown) - Scaled Down */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-[var(--color-card)] rounded-xl shadow-xl border border-gray-200 p-3 transform transition-all origin-top-right">
            <div className="grid grid-cols-3 gap-2">
                {apps.map((app) => (
                    <a
                        key={app.name}
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-black/5 transition-colors group"
                    >
                        <div className="w-10 h-10 flex items-center justify-center mb-1">
                            <img src={app.icon} alt={app.name} className="w-8 h-8 group-hover:scale-110 transition-transform duration-200" />
                        </div>
                        <span className="text-[10px] font-medium text-[var(--color-primary)]">{app.name}</span>
                    </a>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}