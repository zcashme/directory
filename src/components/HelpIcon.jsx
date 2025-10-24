import { useState } from "react";

function HelpIcon({ text }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-block text-gray-500"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
    >
      <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold border border-gray-400 rounded-full text-gray-600 cursor-pointer hover:bg-gray-100 select-none">
        ?
      </span>
      {show && (
        <div className="absolute right-0 mt-1 w-60 text-xs bg-white border border-gray-300 rounded-lg shadow-lg p-2 text-gray-700 z-50">
          {text}
        </div>
      )}
    </div>
  );
}

export default HelpIcon;
