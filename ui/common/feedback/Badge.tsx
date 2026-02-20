"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";

/**
 * Status badge component with multiple variants and optional expansion animation.
 *
 * @example
 * ```tsx
 * <Badge variant="success">Verified</Badge>
 * ```
 *
 * @example
 * ```tsx
 * <Badge variant="warning" size="sm" expandable>
 *   Pending Verification
 * </Badge>
 * ```
 *
 * @example
 * ```tsx
 * <Badge variant="info" icon="ℹ" onClick={handleClick}>
 *   Learn More
 * </Badge>
 * ```
 */
export interface BadgeProps {
  /** Visual style variant */
  variant?: "success" | "warning" | "error" | "info" | "neutral";
  /** Badge size */
  size?: "xs" | "sm" | "md";
  /** Enable expansion animation on hover/touch */
  expandable?: boolean;
  /** Keep badge always expanded (no hover needed) */
  alwaysExpanded?: boolean;
  /** Optional icon to display before text */
  icon?: ReactNode;
  /** Badge content */
  children: ReactNode;
  /** Click handler (makes badge interactive) */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

const VARIANT_CLASSES = {
  success: "text-green-800 bg-gradient-to-r from-green-100 to-green-200 border-green-300",
  warning: "text-yellow-800 bg-gradient-to-r from-yellow-100 to-yellow-200 border-yellow-300",
  error: "text-red-800 bg-gradient-to-r from-red-100 to-red-200 border-red-300",
  info: "text-[var(--color-brand-blue)] bg-gradient-to-r from-[var(--color-brand-blue)]/15 to-[var(--color-brand-blue)]/25 border-[var(--color-brand-blue)]/40",
  neutral: "text-gray-800 bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300",
};

const SIZE_CLASSES = {
  xs: "text-[10px] px-1.5 py-0.5",
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
};

/**
 * Badge - Status indicator with consistent styling.
 *
 * Features:
 * - Multiple color variants for different states
 * - Optional expansion animation on hover/touch
 * - Configurable sizes
 * - Optional icon support
 * - Interactive mode with onClick handler
 */
export default function Badge({
  variant = "neutral",
  size = "sm",
  expandable = false,
  alwaysExpanded = false,
  icon,
  children,
  onClick,
  className = "",
}: BadgeProps) {
  const [isExpanded, setIsExpanded] = useState(alwaysExpanded);

  useEffect(() => {
    if (alwaysExpanded) {
      setIsExpanded(true);
    }
  }, [alwaysExpanded]);

  // Auto-collapse after 2 seconds when expanded via touch
  useEffect(() => {
    if (expandable && isExpanded && !alwaysExpanded) {
      const timer = setTimeout(() => setIsExpanded(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, expandable, alwaysExpanded]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (expandable && !alwaysExpanded) {
      e.stopPropagation();
      setIsExpanded(true);
    }
  };

  const baseClasses = `
    inline-flex items-center gap-1 rounded-full
    font-semibold tracking-wide select-none whitespace-nowrap
    border shadow-xs transition-all duration-300
    ${SIZE_CLASSES[size]}
    ${VARIANT_CLASSES[variant]}
    ${expandable && !alwaysExpanded ? "group/badge" : ""}
    ${onClick ? "cursor-pointer hover:opacity-80" : ""}
  `.trim().replace(/\s+/g, " ");

  const contentClasses = expandable && !alwaysExpanded
    ? `overflow-hidden transition-all duration-300 ${
        isExpanded
          ? "max-w-[200px] opacity-100"
          : "max-w-0 opacity-0 group-hover/badge:max-w-[200px] group-hover/badge:opacity-100"
      }`
    : "";

  return (
    <span
      onClick={onClick}
      onTouchStart={handleTouchStart}
      className={`${baseClasses} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {expandable && !alwaysExpanded ? (
        <span className={contentClasses}>{children}</span>
      ) : (
        children
      )}
    </span>
  );
}
