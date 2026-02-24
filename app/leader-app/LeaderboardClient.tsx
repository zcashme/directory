"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";

// ── PodiumAvatar ──────────────────────────────────────────────

export function PodiumAvatar({
  profileHref,
  imageUrl,
  name,
  emoji,
  size,
}: {
  profileHref: string;
  imageUrl: string | null;
  name: string;
  emoji: string;
  size: number;
}) {
  return (
    <div className="relative transition-transform duration-150 hover:scale-110">
      <Link href={profileHref} aria-label="View profile">
        <ProfileAvatar
          profile={{ profile_image_url: imageUrl ?? undefined, name }}
          size={size}
        />
      </Link>
      <span
        className="absolute left-1/2 -bottom-2 -translate-x-1/2 text-2xl sm:text-3xl z-20 select-none pointer-events-none"
        aria-hidden="true"
      >
        {emoji}
      </span>
    </div>
  );
}

// ── LeaderAvatar ──────────────────────────────────────────────

export function LeaderAvatar({
  imageUrl,
  name,
  size,
}: {
  imageUrl: string | null;
  name: string;
  size: number;
}) {
  return (
    <ProfileAvatar
      profile={{ profile_image_url: imageUrl ?? undefined, name }}
      size={size}
    />
  );
}

// ── LeaderboardTable ──────────────────────────────────────────

const ROWS_PER_PAGE = 10;

export function LeaderboardTable({
  children,
  totalRows,
}: {
  children: ReactNode[];
  totalRows: number;
}) {
  const [visibleCount, setVisibleCount] = useState(ROWS_PER_PAGE);

  const visibleChildren = children.slice(0, visibleCount);
  const hasMore = visibleCount < totalRows;

  // Split into chunks for animation
  const chunks: ReactNode[][] = [];
  for (let i = 0; i < visibleChildren.length; i += ROWS_PER_PAGE) {
    chunks.push(visibleChildren.slice(i, i + ROWS_PER_PAGE));
  }

  return (
    <>
      <AnimatePresence initial={false}>
        {chunks.map((chunk, chunkIndex) => {
          if (chunkIndex === 0) {
            return <div key="leader-chunk-0">{chunk}</div>;
          }
          return (
            <motion.div
              key={`leader-chunk-${chunkIndex}`}
              className="overflow-hidden"
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
            >
              {chunk}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {(visibleCount > ROWS_PER_PAGE || hasMore) && (
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-2">
            {visibleCount > ROWS_PER_PAGE && (
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => Math.max(ROWS_PER_PAGE, prev - ROWS_PER_PAGE))}
                className="rounded-xl border border-gray-800 bg-transparent px-4 py-2 text-sm font-normal text-gray-900 transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
              >
                Show less
              </button>
            )}
            {hasMore && (
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => Math.min(prev + ROWS_PER_PAGE, totalRows))}
                className="rounded-xl border border-gray-800 bg-transparent px-4 py-2 text-sm font-normal text-gray-900 transition-colors hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
              >
                Show more
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── AssumptionDetails ─────────────────────────────────────────

export function AssumptionDetails({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="mt-2 text-[var(--color-brand-blue)] underline underline-offset-2 hover:text-[var(--color-brand-blue)]"
      >
        {open ? "Hide column descriptions/calculations" : "Show column descriptions/calculations"}
      </button>
      {open && (
        <div className="mt-3 space-y-2 border-t border-gray-300 pt-3">
          {children}
        </div>
      )}
    </>
  );
}

// ── ClickStopLink ─────────────────────────────────────────────
// A Link that stops click propagation — safe to render from server
// components that get passed as props to client components.

export function ClickStopLink({
  href,
  className,
  ariaLabel,
  children,
}: {
  href: string;
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  );
}
