"use client";

import { useState, useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import type { ProfileTrustWarning } from "@/lib/profile/types";

const TONE_CLASSES: Record<ProfileTrustWarning["tone"], { container: string; button: string }> = {
  positive: { container: "text-green-700 bg-green-50 border-green-200", button: "text-green-700" },
  neutral:  { container: "text-gray-700 bg-gray-50 border-gray-200",   button: "text-gray-700" },
  yellow:   { container: "text-yellow-900 bg-yellow-50 border-yellow-200", button: "text-yellow-900" },
  red:      { container: "text-red-600 bg-red-50 border-red-200",     button: "text-red-600" },
};

interface ProfileCardWarningProps {
  config: ProfileTrustWarning;
}

export default function ProfileCardWarning({ config }: ProfileCardWarningProps) {
  const shouldReduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const dur = shouldReduceMotion ? "duration-100" : "duration-300 ease-in-out";
  const tone = TONE_CLASSES[config.tone];

  useEffect(() => {
    if (config.defaultExpanded !== undefined) setExpanded(!!config.defaultExpanded);
  }, [config.defaultExpanded]);

  return (
    <div className={`mt-5 text-xs rounded-md px-4 py-2 border text-center mx-auto w-fit transition-colors duration-300 ${tone.container}`}>
      <div className="inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5">
        <span>{config.summary}</span>
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          aria-expanded={expanded}
          className={`ml-1 whitespace-nowrap hover:underline text-xs font-semibold ${tone.button}`}
        >
          <span className="font-semibold">{expanded ? "Hide" : (config.toggleLabel || "Warnings")}</span>{" "}
          <span aria-hidden className={`inline-block transition-transform ${dur} ${expanded ? "rotate-180" : "rotate-0"}`}>▼</span>
        </button>
      </div>
      <div
        aria-hidden={!expanded}
        className={`overflow-hidden transition-all ${dur} ${expanded ? "max-h-40 opacity-100 mt-1" : "max-h-0 opacity-0 mt-0"}`}
      >
        <div className={`text-xs space-y-1 transition-transform ${dur} ${expanded ? "translate-y-0" : "-translate-y-1"}`}>
          {config.details.map((line, i) => <div key={`${config.tone}-${i}`}>{line}</div>)}
        </div>
      </div>
    </div>
  );
}
