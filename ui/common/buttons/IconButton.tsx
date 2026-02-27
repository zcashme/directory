import type { ReactNode } from "react";

/**
 * Icon-only button variant with consistent sizing and styling.
 *
 * @example
 * ```tsx
 * <IconButton variant="ghost" size="sm" title="Close">
 *   ✕
 * </IconButton>
 * ```
 *
 * @example
 * ```tsx
 * <IconButton variant="primary" size="md" onClick={handleEdit} title="Edit">
 *   ✎
 * </IconButton>
 * ```
 */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: "primary" | "secondary" | "danger" | "ghost";
  /** Button size (affects both padding and icon size) */
  size?: "xs" | "sm" | "md" | "lg";
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Icon content (emoji, SVG, or text) */
  children: ReactNode;
}

const VARIANT_CLASSES = {
  primary: "border-black/30 text-[var(--color-brand-blue)] hover:border-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue)]/10",
  secondary: "border-black/30 text-gray-700 hover:bg-gray-100",
  danger: "border-red-400 text-red-600 hover:bg-red-50",
  ghost: "border-transparent text-gray-600 hover:text-[var(--color-brand-blue)]",
};

const SIZE_CLASSES = {
  xs: "text-xs p-1",
  sm: "text-sm p-1.5",
  md: "text-base p-2",
  lg: "text-lg p-2.5",
};

/**
 * IconButton - Button component optimized for icon-only use cases.
 *
 * Uses square padding and centered content for icons. Always provide a `title`
 * attribute for accessibility.
 */
export default function IconButton({
  variant = "ghost",
  size = "sm",
  disabled = false,
  className = "",
  children,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`
        rounded-xl border transition-all
        flex items-center justify-center
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
