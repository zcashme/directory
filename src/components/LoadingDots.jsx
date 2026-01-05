import React from "react";

export default function LoadingDots({
  colors = ["#000000", "#000000", "#000000", "#000000"],
  message = "Loading directory…",
  className = "",
}) {
  const palette = colors.length === 4 ? colors : ["#000000", "#000000", "#000000", "#000000"];

  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className="flex space-x-2">
        {palette.map((color, index) => (
          <span
            key={`${color}-${index}`}
            className={`w-3 h-3 rounded-full animate-twinkle ${
              index === 1 ? "delay-150" : index === 2 ? "delay-300" : index === 3 ? "delay-500" : ""
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      {message ? (
        <p className="text-sm text-gray-600 font-medium tracking-wide">{message}</p>
      ) : null}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        .animate-twinkle {
          animation: twinkle 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
