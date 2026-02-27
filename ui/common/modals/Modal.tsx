"use client";

import { useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ModalPortal from "@/ui/common/ModalPortal";

/**
 * Base modal component with backdrop, animations, and size variants.
 *
 * @example
 * ```tsx
 * <Modal isOpen={isOpen} onClose={handleClose} size="md">
 *   <ModalHeader title="Delete Confirmation" onClose={handleClose} />
 *   <ModalBody>Are you sure?</ModalBody>
 *   <ModalFooter>
 *     <Button onClick={handleClose}>Cancel</Button>
 *   </ModalFooter>
 * </Modal>
 * ```
 *
 * @example
 * ```tsx
 * <Modal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   size="lg"
 *   closeOnBackdrop={false}
 *   closeOnEscape={false}
 *   showCloseButton
 * >
 *   {children}
 * </Modal>
 * ```
 */
interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Size variant */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "full";
  /** Close modal when clicking backdrop (default: true) */
  closeOnBackdrop?: boolean;
  /** Close modal when pressing Escape key (default: true) */
  closeOnEscape?: boolean;
  /** Modal content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Show close button in top-right (default: false) */
  showCloseButton?: boolean;
}

const SIZE_CLASSES = {
  xs: "max-w-[320px]",
  sm: "max-w-[384px]",
  md: "max-w-[448px]",
  lg: "max-w-[512px]",
  xl: "max-w-[576px]",
  full: "max-w-full m-4",
};

/**
 * Modal - Base modal component with backdrop, animations, and accessibility features.
 *
 * Features:
 * - Portal rendering to document.body
 * - Backdrop blur and click-to-close
 * - Escape key handling
 * - Smooth fade-in animations with Framer Motion
 * - Multiple size variants
 * - Optional close button
 *
 * Use ModalHeader, ModalBody, and ModalFooter for consistent internal structure.
 */
export default function Modal({
  isOpen,
  onClose,
  size = "md",
  closeOnBackdrop = true,
  closeOnEscape = true,
  children,
  className = "",
  showCloseButton = false,
}: ModalProps) {
  // Handle escape key press
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <ModalPortal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50"
              onClick={handleBackdropClick}
            />

            {/* Modal card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`
                relative w-full bg-white rounded-2xl
                shadow-xl border border-black/30
                ${SIZE_CLASSES[size]}
                ${className}
              `.trim().replace(/\s+/g, " ")}
            >
              {/* Optional close button */}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-gray-100
                           flex items-center justify-center transition-colors z-10"
                  aria-label="Close modal"
                  type="button"
                >
                  <svg
                    className="w-4 h-4 text-gray-600"
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
                </button>
              )}

              {children}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
