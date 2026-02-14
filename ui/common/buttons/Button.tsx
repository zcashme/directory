import type { ReactNode } from "react";

/**
 * Base button component with support for multiple variants and sizes.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Submit
 * </Button>
 * ```
 *
 * @example
 * ```tsx
 * <Button variant="danger" loading disabled>
 *   Deleting...
 * </Button>
 * ```
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: "primary" | "secondary" | "danger" | "ghost";
  /** Button size */
  size?: "xs" | "sm" | "md" | "lg";
  /** Disabled state */
  disabled?: boolean;
  /** Loading state (shows disabled styling) */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Button content */
  children: ReactNode;
}

const VARIANT_CLASSES = {
  primary: "border-black/30 text-blue-700 hover:border-blue-600 hover:bg-blue-50",
  secondary: "border-black/30 text-gray-700 hover:bg-gray-100",
  danger: "border-red-400 text-red-600 hover:bg-red-50",
  ghost: "border-transparent text-gray-600 hover:text-blue-600",
};

const SIZE_CLASSES = {
  xs: "text-xs px-2 py-1",
  sm: "text-sm px-3 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-base px-5 py-2.5",
};

/**
 * Button component with consistent styling and behavior.
 *
 * Supports multiple variants (primary, secondary, danger, ghost) and sizes (xs, sm, md, lg).
 * Includes disabled and loading states with appropriate visual feedback.
 */
export default function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`
        rounded-xl border font-medium transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${className}
      `.trim().replace(/\s+/g, " ")}
      {...props}
    >
      {children}
    </button>
  );
}
