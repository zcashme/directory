"use client";

import { useState } from "react";
import type { ReactNode } from "react";

/**
 * Section container with optional collapsible functionality.
 *
 * @example
 * ```tsx
 * <Section title="Account Details">
 *   <p>Your account information...</p>
 * </Section>
 * ```
 *
 * @example
 * ```tsx
 * <Section
 *   title="Advanced Settings"
 *   collapsible
 *   defaultOpen={false}
 *   headerAction={<button>Reset</button>}
 * >
 *   <div>Settings content...</div>
 * </Section>
 * ```
 */
interface SectionProps {
  /** Section title */
  title: ReactNode;
  /** Whether section starts open (default: true) */
  defaultOpen?: boolean;
  /** Whether section can be collapsed */
  collapsible?: boolean;
  /** Section content */
  children: ReactNode;
  /** Optional action element in header (button, badge, etc.) */
  headerAction?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Section - Container with optional collapse/expand functionality.
 *
 * Features:
 * - Optional collapsible behavior with smooth animation
 * - Header with title and optional action element
 * - Configurable default open/closed state
 * - Smooth max-height and opacity transitions
 */
export default function Section({
  title,
  defaultOpen = true,
  collapsible = false,
  children,
  headerAction,
  className = "",
}: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    if (collapsible) {
      setIsOpen((prev) => !prev);
    }
  };

  return (
    <div className={`${className}`.trim()}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        {collapsible ? (
          <button
            onClick={handleToggle}
            className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-[var(--color-brand-blue)] transition-colors"
            type="button"
          >
            <span className={`transition-transform ${isOpen ? "rotate-90" : ""}`}>
              ▸
            </span>
            {title}
          </button>
        ) : (
          <h3 className="text-sm font-semibold text-gray-900 m-0">{title}</h3>
        )}
        {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
      </div>

      {/* Content */}
      {collapsible ? (
        <div
          className={`overflow-hidden transition-all duration-200 ${
            isOpen
              ? "max-h-[2000px] opacity-100 pointer-events-auto"
              : "max-h-0 opacity-0 pointer-events-none"
          }`}
        >
          <div
            className={`transition-all duration-200 ${
              isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
            }`}
          >
            {children}
          </div>
        </div>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}
