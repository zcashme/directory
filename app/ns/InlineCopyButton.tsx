"use client";
import { useState } from "react";

interface InlineCopyButtonProps {
  text: string;
}

export default function InlineCopyButton({ text }: InlineCopyButtonProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors
    }
  };

  return (
    <button
      type="button"
      onClick={() => {
        void handleCopy();
      }}
      title={copied ? "Copied" : "Copy"}
      className={`flex items-center gap-1 px-1 text-xs transition-colors ${
        copied ? "text-green-600" : "text-gray-500 hover:text-[var(--color-brand-blue)]"
      }`}
    >
      {copied ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            d="M5 12l4 4 10-10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            d="M9 9h10v10H9z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M5 5h10v10H5z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      )}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
