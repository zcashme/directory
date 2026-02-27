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
    <div className="flex flex-col">
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
        <div className="mt-6 flex justify-center">
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
    </div>
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

// ── FAQ Accordion ──────────────────────────────────────────────

interface FAQItem {
  id: string;
  question: string;
  answer: string | ReactNode;
}

export function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <motion.div
          key={item.id}
          className="border border-gray-800 rounded-xl overflow-hidden bg-transparent"
        >
          <button
            type="button"
            onClick={() => setOpenId(openId === item.id ? null : item.id)}
            className="w-full px-4 py-3 text-left font-medium text-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-between"
          >
            <span>{item.question}</span>
            <motion.span
              animate={{ rotate: openId === item.id ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-gray-600 shrink-0 ml-2"
            >
              ▼
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {openId === item.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 340, damping: 34 }}
                className="overflow-hidden border-t border-gray-200"
              >
                <div className="px-4 py-3 text-sm text-gray-700">{item.answer}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}
