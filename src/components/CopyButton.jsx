import { useState } from "react";

export default function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center justify-center gap-1 border rounded-xl px-3 py-1.5 h-8 text-sm transition-all duration-200 sm:basis-[48%] ${
        copied
          ? "border-green-500 text-green-600 bg-green-50"
          : "border-gray-400 hover:border-blue-500 text-gray-700"
      }`}
    >
      <span className="text-base">{copied ? "✓" : "⧉"}</span>
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}
