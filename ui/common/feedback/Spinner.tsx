/**
 * Loading spinner indicator.
 *
 * @example
 * ```tsx
 * <Spinner />
 * ```
 *
 * @example
 * ```tsx
 * <Spinner size="lg" color="blue" />
 * ```
 */
export interface SpinnerProps {
  /** Spinner size */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Spinner color */
  color?: "gray" | "blue" | "green" | "red";
  /** Additional CSS classes */
  className?: string;
}

const SIZE_CLASSES = {
  xs: "w-3 h-3 border-2",
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-3",
  xl: "w-12 h-12 border-4",
};

const COLOR_CLASSES = {
  gray: "border-gray-300 border-t-gray-600",
  blue: "border-blue-300 border-t-blue-600",
  green: "border-green-300 border-t-green-600",
  red: "border-red-300 border-t-red-600",
};

/**
 * Spinner - Animated loading indicator.
 *
 * Uses a CSS animation to create a rotating border effect.
 * Lightweight and performant with no dependencies.
 */
export default function Spinner({
  size = "md",
  color = "blue",
  className = "",
}: SpinnerProps) {
  return (
    <div
      className={`
        rounded-full animate-spin
        ${SIZE_CLASSES[size]}
        ${COLOR_CLASSES[color]}
        ${className}
      `.trim().replace(/\s+/g, " ")}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
