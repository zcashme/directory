"use client";

import { useState, type ReactNode } from "react";
import Modal from "./Modal";
import ModalHeader from "./ModalHeader";
import ModalBody from "./ModalBody";
import ModalFooter from "./ModalFooter";
import Button from "@/ui/common/buttons/Button";

/**
 * Pre-built confirmation dialog with customizable styling and actions.
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   onConfirm={handleDelete}
 *   title="Delete Account"
 *   message="This action cannot be undone. Are you sure?"
 *   variant="danger"
 *   confirmText="Delete"
 *   cancelText="Cancel"
 * />
 * ```
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   onConfirm={async () => {
 *     await saveChanges();
 *   }}
 *   title="Save Changes"
 *   message={
 *     <div>
 *       <p>You have unsaved changes.</p>
 *       <p className="mt-2">Would you like to save them?</p>
 *     </div>
 *   }
 *   variant="primary"
 * />
 * ```
 */
export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when confirm button is clicked */
  onConfirm: () => void | Promise<void>;
  /** Dialog title */
  title: string;
  /** Dialog message (can be string or custom ReactNode) */
  message: string | ReactNode;
  /** Confirm button text (default: "Confirm") */
  confirmText?: string;
  /** Cancel button text (default: "Cancel") */
  cancelText?: string;
  /** Visual variant affecting confirm button style (default: "primary") */
  variant?: "danger" | "warning" | "info" | "primary";
  /** Loading state (disables buttons) */
  loading?: boolean;
  /** Disabled state (disables confirm button) */
  disabled?: boolean;
}

/**
 * ConfirmDialog - Pre-built confirmation dialog for common confirm/cancel flows.
 *
 * Features:
 * - Multiple style variants (danger, warning, info, primary)
 * - Async support for onConfirm handler
 * - Loading and disabled states
 * - Customizable button text
 * - Supports ReactNode for complex messages
 *
 * Ideal for delete confirmations, save dialogs, and other binary choices.
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  loading = false,
  disabled = false,
}: ConfirmDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      await onConfirm();
    } finally {
      setIsProcessing(false);
    }
  };

  // Map variant to button variant
  const buttonVariant = variant === "danger" ? "danger" : "primary";

  // Determine if buttons should be disabled
  const isDisabled = disabled || loading || isProcessing;

  // Title color based on variant
  const getTitleColor = () => {
    switch (variant) {
      case "danger":
        return "text-red-600";
      case "warning":
        return "text-yellow-600";
      case "info":
        return "text-blue-600";
      case "primary":
      default:
        return "text-gray-800";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" closeOnBackdrop={!isProcessing}>
      <ModalHeader
        title={<span className={getTitleColor()}>{title}</span>}
        onClose={onClose}
      />

      <ModalBody>
        <div className="text-sm text-gray-700 leading-relaxed">
          {typeof message === "string" ? <p>{message}</p> : message}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isProcessing}
        >
          {cancelText}
        </Button>
        <Button
          variant={buttonVariant}
          onClick={() => {
            void handleConfirm();
          }}
          disabled={isDisabled}
          loading={isProcessing}
        >
          {isProcessing ? "Processing..." : confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
