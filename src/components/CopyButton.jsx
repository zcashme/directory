import { useState } from "react";

export default function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={`flex items-center gap-1 border rounded-xl h-7 px-3 py-1.5 text-sm transition-all duration-200 ${
        copied
          ? "border-green-500 text-green-600 bg-green-50"
          : "border-gray-400 hover:border-blue-500 text-gray-700"
      }`}
    >
      <span className="text-base">
        {copied ? "✓" : "⧉"}
      </span>
      <span>{label}</span>
    </button>
  );
}
