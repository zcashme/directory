import React, { useState } from "react";

export default function HelpMessage({
  introText = "Complete this transaction using your wallet.",
  helpText = 'Scan the QR code below. Alternatively, copy the URI and paste it into the "To:" address field. Some wallets also allow you to tap the URI link or upload an image of the QR.',
  className = "",
}) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className={className}>
      <div className="w-full flex items-center justify-center gap-2 text-center mt-2 mb-0">
        <p className="text-[12px] text-gray-600 italic m-0">{introText}</p>
        <button
          type="button"
          onClick={() => setShowHelp((prev) => !prev)}
          className="text-[12px] font-semibold text-blue-600 underline m-0"
        >
          {showHelp ? "Hide help" : "Help"}
        </button>
      </div>
      <div
        className={`w-full flex items-center justify-center text-center overflow-hidden transition-all duration-200 ${
          showHelp
            ? "max-h-24 opacity-100 mt-1 pointer-events-auto"
            : "max-h-0 opacity-0 mt-0 pointer-events-none"
        }`}
      >
        <p
          className={`text-[12px] italic m-0 text-gray-600 transition-all duration-200 ${
            showHelp ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
          }`}
        >
          {helpText}
        </p>
      </div>
    </div>
  );
}
