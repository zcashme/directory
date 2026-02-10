import { useState } from "react";

interface HelpIconProps {
  text: string;
}

export default function HelpIcon({ text }: HelpIconProps) {
  const [show, setShow] = useState(false);
  const isTouch = typeof window !== "undefined" && "ontouchstart" in window;

  return (
    <div
      className="relative inline-block ml-1"
      onMouseEnter={(e) => {
        e.stopPropagation();
        !isTouch && setShow(true);
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        !isTouch && setShow(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        isTouch && setShow((s) => !s);
      }}
    >
      <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold border border-gray-400 rounded-full text-gray-600 cursor-pointer hover:bg-gray-100 select-none">
        ?
      </span>
      {show && (
        <div className="absolute z-20 w-48 text-xs text-gray-700 bg-white border border-gray-300 rounded-lg shadow-md p-2 -right-1 top-5">
          {text}
        </div>
      )}
    </div>
  );
}
