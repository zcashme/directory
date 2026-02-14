import { useState } from "react";
import type { MouseEvent } from "react";

/**
 * Button that copies text to clipboard with visual feedback.
 *
 * @example
 * ```tsx
 * <CopyButton text="Hello World" label="Copy" />
 * ```
 *
 * @example
 * ```tsx
 * <CopyButton
 *   text="z1abc..."
 *   label="Copy Address"
 *   copiedLabel="Copied!"
 *   size="md"
 * />
 * ```
 */
export interface CopyButtonProps {
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
}

/**
 * CopyButton - Copies text to clipboard with expandable label on hover.
 *
 * Features:
 * - Smooth expand/collapse animation on hover
 * - Visual feedback when text is copied (color change, icon change)
 * - Configurable timeout for feedback display
 * - Stops event propagation to prevent parent click handlers
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
        `group flex items-center justify-center transition-all px-1 ` +
        (copied ? "text-green-600 hover:text-green-600" : "text-gray-500 hover:text-blue-600") +
        " " +
        sizeClasses[size] +
        " " +
        className
      }
    >
      {copied ? copiedIcon : icon}
      <span
        className="inline-block overflow-hidden max-w-0 group-hover:max-w-[50px] opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out text-xs ml-1"
      >
        {copied ? copiedLabel : label}
      </span>
    </button>
  );
}
