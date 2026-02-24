"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "framer-motion";
import type { ProfileTrustWarning } from "@/lib/profile/types";

const TONE_CLASSES: Record<ProfileTrustWarning["tone"], { container: string; button: string }> = {
  positive: { container: "text-green-700 bg-green-50 border-green-200", button: "text-green-700" },
  neutral: { container: "text-gray-700 bg-gray-50 border-gray-200", button: "text-gray-700" },
  yellow: { container: "text-yellow-900 bg-yellow-50 border-yellow-200", button: "text-yellow-900" },
  red: { container: "text-red-600 bg-red-50 border-red-200", button: "text-red-600" },
};

interface ProfileCardWarningProps {
  config: ProfileTrustWarning;
}

export default function ProfileCardWarning({ config }: ProfileCardWarningProps) {
  const shouldReduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [boxWidthPx, setBoxWidthPx] = useState<number | null>(null);
  const dur = shouldReduceMotion ? "duration-100" : "duration-300 ease-in-out";
  const tone = TONE_CLASSES[config.tone];
  const summaryRef = useRef<HTMLDivElement>(null);
  const detailsMeasureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (config.defaultExpanded !== undefined) setExpanded(!!config.defaultExpanded);
  }, [config.defaultExpanded]);

  const recalcWidth = useCallback(() => {
    const summaryWidth = summaryRef.current?.scrollWidth ?? 0;
    const detailsWidth = detailsMeasureRef.current?.scrollWidth ?? 0;

    // Collapsed: keep the box tight to the summary line.
    const collapsedWidth = Math.ceil(summaryWidth + 12);

    // Expanded: include details and horizontal padding, capped for mobile friendliness.
    const expandedWidth = Math.min(560, Math.ceil(Math.max(summaryWidth, detailsWidth) + 24));

    setBoxWidthPx(expanded ? expandedWidth : collapsedWidth);
  }, [expanded]);

  useEffect(() => {
    recalcWidth();
    window.addEventListener("resize", recalcWidth);
    return () => window.removeEventListener("resize", recalcWidth);
  }, [recalcWidth, config.summary, config.details]);

  return (
    <div className="mt-5 flex w-full justify-center">
      <div
        className={`relative overflow-hidden -translate-y-[1px] max-w-[560px] text-xs rounded-md border text-center shadow-[0_1px_0_rgba(255,255,255,0.75)_inset,0_2px_4px_rgba(0,0,0,0.12)] transition-[width,background-color,border-color,color] ${dur} ${tone.container}`}
        style={{ width: boxWidthPx ? `${boxWidthPx}px` : undefined }}
      >
        <div ref={summaryRef} className={`inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 py-2 ${expanded ? "px-3" : "px-2"}`}>
          <span>{config.summary}</span>
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            aria-expanded={expanded}
            className={`ml-1 whitespace-nowrap hover:underline text-xs font-semibold ${tone.button}`}
          >
            <span className="font-semibold">{expanded ? "Hide" : (config.toggleLabel || "Warnings")}</span>{" "}
            <span aria-hidden className={`inline-block transition-transform ${dur} ${expanded ? "rotate-180" : "rotate-0"}`}>{"\u25BE"}</span>
          </button>
        </div>

        <div
          aria-hidden={!expanded}
          className={`overflow-hidden transition-all ${dur} ${expanded ? "max-h-40 opacity-100 mt-1 pb-2 px-3" : "max-h-0 opacity-0 mt-0 px-0 pb-0"}`}
        >
          <div className={`text-xs space-y-1 transition-transform ${dur} ${expanded ? "translate-y-0" : "-translate-y-1"}`}>
            {config.details.map((line, i) => <div key={`${config.tone}-${i}`}>{line}</div>)}
          </div>
        </div>

        <div className="pointer-events-none absolute -left-[9999px] top-0 invisible" aria-hidden>
          <div ref={detailsMeasureRef} className="px-3 text-xs">
            {config.details.map((line, i) => <div key={`measure-${config.tone}-${i}`}>{line}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
