import type { ReactNode, CSSProperties } from "react";

interface VerifiedCardWrapperProps {
  verifiedCount?: number;
  featured?: boolean;
  onClick?: () => void;
  unstyled?: boolean;
  borderAccentColor?: string | null;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

function hexToRgba(hex: string, alpha: number): string {
  const trimmed = hex.trim().toLowerCase();
  if (trimmed === "transparent") return `rgba(0, 0, 0, 0)`;
  const value = trimmed.replace("#", "");
  const isValid = /^[0-9a-fA-F]{6}$/.test(value);
  if (!isValid) return `rgba(17, 24, 39, ${alpha})`;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function VerifiedCardWrapper({
  verifiedCount = 0,
  featured = false,
  onClick,
  unstyled = false,
  borderAccentColor = null,
  className = "",
  style,
  children,
}: VerifiedCardWrapperProps) {
  const baseStyle = unstyled ? "" : "rounded-2xl p-3 border transition-all shadow-xs";
  const clickStyle = onClick && !unstyled ? "cursor-pointer" : "";
  const hasCustomBorder = !unstyled && typeof borderAccentColor === "string" && borderAccentColor.trim().length > 0;
  // Keep API compatibility for existing callers; styling no longer depends on trust tiers.
  void verifiedCount;
  void featured;

  const surfaceStyle = unstyled ? "" : "bg-transparent";
  const defaultBorderStyle = unstyled ? "" : "border-black/70 hover:shadow-[0_0_8px_rgba(17,24,39,0.3)]";
  const borderStyle = hasCustomBorder
    ? "border-[var(--verified-card-border)] hover:shadow-[0_0_10px_var(--verified-card-glow)]"
    : "";
  const mergedStyle: CSSProperties = hasCustomBorder
    ? {
        ...(style || {}),
        "--verified-card-border": borderAccentColor as string,
        "--verified-card-glow": hexToRgba(borderAccentColor as string, 0.35),
      } as CSSProperties
    : (style || {});

  return (
    <div
      onClick={onClick}
      className={`${baseStyle} ${clickStyle} ${unstyled ? "" : "transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform hover:scale-[1.02]"} ${surfaceStyle} ${hasCustomBorder ? "" : defaultBorderStyle} ${borderStyle} ${className}`}
      style={mergedStyle}
    >
      {/* Foreground content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
