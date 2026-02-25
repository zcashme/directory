import type { ReactNode } from "react";

/**
 * Horizontal divider with multiple style variants.
 *
 * @example
 * ```tsx
 * <Divider />
 * ```
 *
 * @example
 * ```tsx
 * <Divider variant="dashed" spacing="lg" />
 * ```
 *
 * @example
 * ```tsx
 * <Divider variant="gradient" />
 * ```
 */
interface DividerProps {
  /** Visual style variant */
  variant?: "solid" | "dashed" | "dotted" | "gradient";
  /** Vertical spacing around divider */
  spacing?: "none" | "xs" | "sm" | "md" | "lg" | "xl";
  /** Optional label to display in center of divider */
  label?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const VARIANT_CLASSES = {
  solid: "border-t border-black/30",
  dashed: "border-t border-dashed border-black/30",
  dotted: "border-t border-dotted border-black/30",
  gradient: "h-px bg-gradient-to-r from-transparent via-black/30 to-transparent border-0",
};

const SPACING_CLASSES = {
  none: "",
  xs: "my-1",
  sm: "my-2",
  md: "my-4",
  lg: "my-6",
  xl: "my-8",
};

/**
 * Divider - Horizontal rule for visual separation.
 *
 * Features:
 * - Multiple visual styles (solid, dashed, dotted, gradient)
 * - Configurable spacing
 * - Optional centered label
 * - Consistent with app design patterns
 */
export default function Divider({
  variant = "solid",
  spacing = "md",
  label,
  className = "",
}: DividerProps) {
  if (label) {
    return (
      <div className={`flex items-center gap-3 ${SPACING_CLASSES[spacing]} ${className}`}>
        <div className={`flex-1 ${VARIANT_CLASSES[variant]}`} />
        <span className="text-xs text-gray-600 font-medium">{label}</span>
        <div className={`flex-1 ${VARIANT_CLASSES[variant]}`} />
      </div>
    );
  }

  return (
    <hr
      className={`
        ${VARIANT_CLASSES[variant]}
        ${SPACING_CLASSES[spacing]}
        ${className}
      `.trim().replace(/\s+/g, " ")}
    />
  );
}
