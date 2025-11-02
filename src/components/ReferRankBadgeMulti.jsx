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
      label: `#${rank} This Week`,
    },
    monthly: {
      emoji: "🗓️",
      bg: "bg-violet-100/80 border-violet-300 text-violet-800",
      label: `#${rank} This Month`,
    },
  };

  const scheme = colorSchemes[period] || colorSchemes.all;

return (
  <span
    className={`group inline-flex items-center gap-1 rounded-full border text-xs font-medium shadow-sm select-none transition-all duration-300 hover:px-2.5 px-1.5 py-0.5 ${scheme.bg}`}
    title={`Ranked #${rank} on ${period} leaderboard`}
  >
    {scheme.emoji}
    <span className="font-semibold">#{rank}</span>
    <span
      className="overflow-hidden inline-block max-w-0 group-hover:max-w-[80px] opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out whitespace-nowrap"
    >
      {period === "all"
        ? " All-Time"
        : period === "weekly"
        ? " This Week"
        : " This Month"}
    </span>
  </span>
);

}
