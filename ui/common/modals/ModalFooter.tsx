"use client";

import type { ReactNode } from "react";

/**
 * Modal footer component for action buttons.
 *
 * @example
 * ```tsx
 * <ModalFooter>
 *   <Button variant="secondary" onClick={onCancel}>Cancel</Button>
 *   <Button variant="primary" onClick={onConfirm}>Confirm</Button>
 * </ModalFooter>
 * ```
 *
 * @example
 * ```tsx
 * <ModalFooter className="justify-between">
 *   <Button variant="ghost">Learn More</Button>
 *   <div className="flex gap-2">
 *     <Button variant="secondary" onClick={onCancel}>Cancel</Button>
 *     <Button variant="danger" onClick={onDelete}>Delete</Button>
 *   </div>
 * </ModalFooter>
 * ```
 */
export interface ModalFooterProps {
  /** Footer content (typically buttons) */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ModalFooter - Footer section for modals containing action buttons.
 *
 * Provides consistent spacing and layout for modal actions. By default,
 * buttons are right-aligned with a gap between them.
 *
 * Use inside Modal component after ModalBody.
 */
export default function ModalFooter({
  children,
  className = "",
}: ModalFooterProps) {
  return (
    <div
      className={`
        border-t border-black/30 px-6 py-4
        flex justify-end gap-2
        ${className}
      `.trim().replace(/\s+/g, " ")}
    >
      {children}
    </div>
  );
}
