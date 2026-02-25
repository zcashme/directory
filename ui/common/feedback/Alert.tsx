"use client";

import { useState } from "react";
import type { ReactNode } from "react";

/**
 * Alert message component for displaying feedback to users.
 *
 * @example
 * ```tsx
 * <Alert variant="error" message="Invalid email address" />
 * ```
 *
 * @example
 * ```tsx
 * <Alert
 *   variant="success"
 *   message="Profile updated successfully"
 *   dismissible
 *   onDismiss={() => console.log('dismissed')}
 * />
 * ```
 *
 * @example
 * ```tsx
 * <Alert variant="warning" size="sm">
 *   <div>
 *     <strong>Warning:</strong> This action cannot be undone.
 *   </div>
 * </Alert>
 * ```
 */
interface AlertProps {
  /** Visual style variant */
  variant?: "error" | "warning" | "success" | "info";
  /** Alert size */
  size?: "sm" | "md";
  /** Message to display (string or ReactNode) */
  message?: string | ReactNode;
  /** Content (alternative to message prop) */
  children?: ReactNode;
  /** Whether alert can be dismissed */
  dismissible?: boolean;
  /** Callback when alert is dismissed */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
}

const VARIANT_CLASSES = {
  error: "bg-red-50 text-red-600 border-red-200",
  warning: "bg-yellow-50 text-yellow-800 border-yellow-200",
  success: "bg-green-50 text-green-700 border-green-200",
  info: "bg-[var(--color-brand-blue)]/10 text-[var(--color-brand-blue)] border-[var(--color-brand-blue)]/30",
};

const SIZE_CLASSES = {
  sm: "text-xs px-3 py-2",
  md: "text-sm px-4 py-3",
};

/**
 * Alert - User feedback message component.
 *
 * Features:
 * - Multiple variants for different message types
 * - Optional dismiss functionality
 * - Configurable sizes
 * - Supports both string messages and ReactNode children
 * - Accessible with ARIA attributes
 */
export default function Alert({
  variant = "info",
  size = "sm",
  message,
  children,
  dismissible = false,
  onDismiss,
  className = "",
}: AlertProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (isDismissed) {
    return null;
  }

  const content = children || message;

  return (
    <div
      role="alert"
      className={`
        rounded-lg border flex items-start gap-2
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${className}
      `.trim().replace(/\s+/g, " ")}
    >
      <div className="flex-1">
        {typeof content === "string" ? (
          <p className="m-0">{content}</p>
        ) : (
          content
        )}
      </div>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-current opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss alert"
          type="button"
        >
          ✕
        </button>
      )}
    </div>
  );
}
