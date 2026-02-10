import { useState } from "react";
import type { MouseEvent } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  icon?: string;
  copiedIcon?: string;
  timeout?: number;
  size?: "xs" | "sm" | "md";
}

export default function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  className = "",
  icon = "⧉",
  copiedIcon = "⮼",
  timeout = 2000,
  size = "sm",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
  };

  const handleCopy = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), timeout);
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? copiedLabel : label}
      className={
        `group flex items-center justify-center transition-all px-1 overflow-hidden ` +
        (copied ? "text-green-600 hover:text-green-600" : "text-gray-500 hover:text-blue-600") +
        " " +
        sizeClasses[size] +
        " " +
        className
      }
    >
      {copied ? copiedIcon : icon}
      <span
        className="inline-block max-w-0 group-hover:max-w-[50px] opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out text-xs ml-1"
      >
        {copied ? copiedLabel : label}
      </span>
    </button>
  );
}
