import type { ReactNode } from "react";

/**
 * Container component with consistent border, background, and shadow styling.
 *
 * @example
 * ```tsx
 * <Card>
 *   <h2>Profile Information</h2>
 *   <p>Content goes here...</p>
 * </Card>
 * ```
 *
 * @example
 * ```tsx
 * <Card padding="lg" shadow="lg" className="mb-4">
 *   <div>Custom content</div>
 * </Card>
 * ```
 */
export interface CardProps {
  /** Card content */
  children: ReactNode;
  /** Padding size */
  padding?: "none" | "sm" | "md" | "lg";
  /** Shadow depth */
  shadow?: "none" | "sm" | "md" | "lg" | "xl";
  /** Border radius size */
  rounded?: "md" | "lg" | "xl" | "2xl";
  /** Additional CSS classes */
  className?: string;
}

const PADDING_CLASSES = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

const SHADOW_CLASSES = {
  none: "",
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
};

const ROUNDED_CLASSES = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

/**
 * Card - Container component with consistent styling.
 *
 * Provides a standardized container following the application's design patterns:
 * - White background with transparency
 * - Black border with opacity
 * - Configurable shadow and border radius
 * - Consistent padding options
 */
export default function Card({
  children,
  padding = "md",
  shadow = "sm",
  rounded = "2xl",
  className = "",
}: CardProps) {
  return (
    <div
      className={`
        bg-white/85 border border-black/30
        ${PADDING_CLASSES[padding]}
        ${SHADOW_CLASSES[shadow]}
        ${ROUNDED_CLASSES[rounded]}
        ${className}
      `.trim().replace(/\s+/g, " ")}
    >
      {children}
    </div>
  );
}
