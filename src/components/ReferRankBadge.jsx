import React from "react";

export default function ReferRankBadge({ rank }) {
  if (!rank || rank > 10) return null; // only show top 10

  let colors = {
    bg: "bg-amber-100/70",
    text: "text-amber-800",
    border: "border-amber-300",
  };

  if (rank === 1) {
    colors = {
      bg: "bg-yellow-200/70",
      text: "text-yellow-900",
      border: "border-yellow-400",
    };
  } else if (rank === 2) {
    colors = {
      bg: "bg-gray-200/70",
      text: "text-gray-800",
      border: "border-gray-400",
    };
  } else if (rank === 3) {
    colors = {
      bg: "bg-orange-200/70",
      text: "text-orange-900",
      border: "border-orange-400",
    };
  }

  const label =
    rank === 1
      ? "🥇 #1 Referrer"
      : rank === 2
      ? "🥈 #2 Referrer"
      : rank === 3
      ? "🥉 #3 Referrer"
      : `#${rank} Referrer`;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border} shadow-sm select-none`}
      title={`Ranked #${rank} on referral board`}
    >
      {label}
    </span>
  );
}
