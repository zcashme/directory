"use client";

import type { ReactNode } from "react";

/**
 * Modal body component with scrollable content area.
 *
 * @example
 * ```tsx
 * <ModalBody>
 *   <p>This is the modal content.</p>
 * </ModalBody>
 * ```
 *
 * @example
 * ```tsx
 * <ModalBody scrollable={false} className="space-y-4">
 *   <Input label="Name" />
 *   <Input label="Email" />
 * </ModalBody>
 * ```
 */
export interface ModalBodyProps {
  /** Modal body content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Enable vertical scrolling (default: true) */
  scrollable?: boolean;
}

/**
 * ModalBody - Content area for modals with optional scrolling.
 *
 * Provides consistent padding and optional scroll behavior for modal content.
 * Set scrollable to false for short content that doesn't need scrolling.
 *
 * Use inside Modal component between ModalHeader and ModalFooter.
 */
export default function ModalBody({
  children,
  className = "",
  scrollable = true,
}: ModalBodyProps) {
  return (
    <div
      className={`
        px-6 py-4
        ${scrollable ? "overflow-y-auto max-h-[60vh]" : ""}
        ${className}
      `.trim().replace(/\s+/g, " ")}
    >
      {children}
    </div>
  );
}
