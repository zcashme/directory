import { useState } from "react";
import type { MouseEvent } from "react";

/**
 * Button that copies text to clipboard with visual feedback.
 */
interface CopyButtonProps {
  /** Text to copy to clipboard */
  text: string;
  /** Label shown on hover (default state) */
  label?: string;
  /** Label shown after copying */
  copiedLabel?: string;
  /** Additional CSS classes */
  className?: string;
  /** Icon shown in default state */
  icon?: string;
  /** Icon shown after copying */
  copiedIcon?: string;
  /** Duration in ms to show "copied" state */
  timeout?: number;
  /** Button size */
  size?: "xs" | "sm" | "md";
  /** Keep label expanded without hover */
  expanded?: boolean;
  /** Base color for uncopied state */
  defaultColorClass?: string;
}

/**
 * CopyButton - Copies text to clipboard with expandable label on hover.
 */
export default function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  className = "",
  icon = "⧉",
  copiedIcon = "⮼",
  timeout = 2000,
  size = "sm",
  expanded = false,
  defaultColorClass = "text-gray-500",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
  };

  const handleCopy = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    } catch {
      // clipboard denied — don't show "Copied"
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? copiedLabel : label}
      className={
        `group flex items-center justify-center transition-all px-1 ` +
        (copied ? "text-green-600 hover:text-green-600" : `${defaultColorClass} hover:text-[var(--color-brand-blue)]`) +
        " " +
        sizeClasses[size] +
        " " +
        className
      }
    >
      {copied ? copiedIcon : icon}
      <span
        className={`inline-block overflow-hidden transition-all duration-300 ease-in-out text-xs ml-1 ${
          expanded
            ? "max-w-[50px] opacity-100"
            : "max-w-0 group-hover:max-w-[50px] opacity-0 group-hover:opacity-100"
        }`}
      >
        {copied ? copiedLabel : label}
      </span>
    </button>
  );
}
