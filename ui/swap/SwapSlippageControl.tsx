"use client";

import { useState } from "react";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { OUTLINE_ACTION_BUTTON_CLASSES } from "@/ui/common/buttons/styles";

interface SwapSlippageControlProps {
  value: string;
  onChange: (value: string) => void;
  variant?: "collapsible" | "inline";
  presets?: string[];
}

export default function SwapSlippageControl({
  value,
  onChange,
  variant = "collapsible",
  presets = ["0.1", "0.5", "1", "2", "5"],
}: SwapSlippageControlProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const tapProps = shouldReduceMotion
    ? {}
    : {
      whileTap: { scale: 0.94, y: 1, filter: "brightness(0.95)" },
      transition: { type: "spring" as const, stiffness: 550, damping: 24, mass: 0.35 },
    };

  const handleChange = (newValue: string) => {
    const numValue = parseFloat(newValue);
    if (numValue >= 0 && numValue <= 100) {
      onChange(newValue);
    }
  };

  const handleInputChange = (inputValue: string) => {
    if (inputValue === "") {
      onChange("0.5");
      return;
    }
    if (!/^\d*\.?\d*$/.test(inputValue)) return;
    const numValue = parseFloat(inputValue);
    if (!Number.isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      onChange(inputValue);
    }
  };

  const handleBlur = (inputValue: string) => {
    const trimmed = inputValue.trim();
    if (!trimmed || Number.isNaN(parseFloat(trimmed))) {
      onChange("0.5");
    }
  };

  useEffect(() => {
    if (!isExpanded) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target || !rootRef.current) return;
      if (!rootRef.current.contains(target)) {
        setIsExpanded(false);
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (!target || !rootRef.current) return;
      if (!rootRef.current.contains(target)) {
        setIsExpanded(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded]);

  if (variant === "inline") {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-gray-600">Slippage tolerance</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={(e) => handleBlur(e.target.value)}
          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-lg text-center text-gray-900 transition-colors duration-200 hover:border-[var(--color-brand-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-blue)] focus:border-[var(--color-brand-blue)]"
        />
        <span className="text-sm text-gray-600">%</span>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="bg-transparent rounded-xl border border-gray-800 overflow-hidden transition-colors duration-200 hover:border-[var(--color-brand-blue)]"
    >
      <motion.button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        {...tapProps}
        className={`${OUTLINE_ACTION_BUTTON_CLASSES} group w-full justify-center bg-transparent border-0 rounded-none hover:border-0`}
      >
        <span className="text-sm">Slippage Tolerance ({value}%)</span>
        <span
          className={`text-current transform transition duration-200 ml-2 ${
            isExpanded ? "rotate-180" : "rotate-0"
          }`}
        >
          ▼
        </span>
      </motion.button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, height: "auto", scale: 1 }}
            exit={{ opacity: 0, y: -8, height: 0, scale: 0.98 }}
            transition={
              shouldReduceMotion
                ? { duration: 0.08 }
                : { duration: 0.18, ease: "easeOut" }
            }
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2">
              <div className="flex items-center gap-2 flex-wrap">
                {presets.map((preset) => (
                  <motion.button
                    key={preset}
                    type="button"
                    onClick={() => handleChange(preset)}
                    {...tapProps}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 border ${
                      value === preset
                        ? "bg-[var(--color-brand-blue)]/10 border-[var(--color-brand-blue)] text-[var(--color-brand-blue)]"
                        : "bg-transparent border-gray-300 text-gray-600 hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] active:text-[var(--color-brand-blue)]"
                    }`}
                  >
                    {preset}%
                  </motion.button>
                ))}
                <div className="flex items-center gap-1 ml-auto">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onBlur={(e) => handleBlur(e.target.value)}
                    placeholder="0.5"
                    className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 transition-colors duration-200 hover:border-[var(--color-brand-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-blue)] focus:border-[var(--color-brand-blue)]"
                  />
                  <span className="text-sm text-gray-600">%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
