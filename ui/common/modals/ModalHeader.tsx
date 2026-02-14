"use client";

import type { ReactNode } from "react";
import IconButton from "@/ui/common/buttons/IconButton";

/**
 * Modal header component with title and optional close button.
 *
 * @example
 * ```tsx
 * <ModalHeader title="Edit Profile" onClose={handleClose} />
 * ```
 *
 * @example
 * ```tsx
 * <ModalHeader
 *   title={<span className="text-red-600">Delete Account</span>}
 *   showCloseButton
 *   onClose={handleClose}
 * />
 * ```
 */
export interface ModalHeaderProps {
  /** Header title (can be string or custom ReactNode) */
  title: ReactNode;
  /** Callback when close button is clicked */
  onClose?: () => void;
  /** Show close button (default: false, but true if onClose is provided) */
  showCloseButton?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ModalHeader - Header section for modals with title and optional close button.
 *
 * Displays a title with a bottom border. Automatically shows a close button
 * if onClose is provided, unless showCloseButton is explicitly set to false.
 *
 * Use inside Modal component for consistent spacing and styling.
 */
export default function ModalHeader({
  title,
  onClose,
  showCloseButton,
  className = "",
}: ModalHeaderProps) {
  // Show close button if onClose is provided and showCloseButton is not explicitly false
  const shouldShowCloseButton = showCloseButton ?? (onClose !== undefined);

  return (
    <div
      className={`
        flex items-center justify-between
        border-b border-black/30 px-6 py-4
        ${className}
      `.trim().replace(/\s+/g, " ")}
    >
      <h2 className="text-lg font-semibold text-gray-800">
        {title}
      </h2>

      {shouldShowCloseButton && onClose && (
        <IconButton
          variant="ghost"
          size="sm"
          onClick={onClose}
          title="Close"
          className="ml-4"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </IconButton>
      )}
    </div>
  );
}
