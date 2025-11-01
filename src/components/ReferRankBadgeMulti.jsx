import React from "react";

export default function ReferRankBadgeMulti({ rank, period = "all" }) {
  if (!rank || rank > 10) return null; // show only top 10

  const colorSchemes = {
    all: {
      emoji: "🏆",
      bg: "bg-amber-100/80 border-amber-300 text-amber-800",
      label: `#${rank} All-Time`,
    },
    weekly: {
      emoji: "📅",
      bg: "bg-sky-100/80 border-sky-300 text-sky-800",
      label: `#${rank} Weekly`,
    },
    monthly: {
      emoji: "🗓️",
      bg: "bg-violet-100/80 border-violet-300 text-violet-800",
      label: `#${rank} Monthly`,
    },
  };

  const scheme = colorSchemes[period] || colorSchemes.all;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold shadow-sm select-none ${scheme.bg} ${scheme.text}`}
      title={`Ranked #${rank} on ${period} leaderboard`}
    >
      {scheme.emoji} {scheme.label}
    </span>
  );
}
