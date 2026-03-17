export const INLINE_SELECTOR_TRIGGER_CLASSES =
  "inline-flex items-center gap-1 text-gray-500 transition-colors duration-150 hover:text-[var(--color-brand-blue)] active:text-[var(--color-brand-blue)]";

export const OUTLINE_ACTION_BUTTON_CLASSES =
  "flex items-center gap-1 border rounded-xl px-3 py-2 text-md transition-all duration-200 border-gray-800 text-gray-700 hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] active:text-[var(--color-brand-blue)] whitespace-nowrap";

export const INLINE_ACTION_BUTTON_CLASSES =
  "flex items-center gap-1 px-3 pl-0 py-2 text-md transition-all duration-200 text-gray-700 hover:text-[var(--color-brand-blue)] active:text-[var(--color-brand-blue)] whitespace-nowrap";

export const PROFILE_CARD_MODAL_CHROME_CLASSES =
  "rounded-[26px] border border-black/70 bg-white/90 backdrop-blur-md shadow-[0_16px_40px_rgba(17,24,39,0.18)] verified-card-hover hover:shadow-[0_0_10px_rgba(17,24,39,0.3)] focus-within:shadow-[0_0_10px_rgba(17,24,39,0.3)] transition-all";

export const PROFILE_CARD_ICON_BUTTON_CLASSES =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white/80 shadow-xs text-gray-600 transition-all hover:text-[var(--color-brand-blue)] hover:border-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue)]/10 active:text-[var(--color-brand-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]/35 focus-visible:ring-offset-1";

export const PROFILE_CARD_OUTLINE_ACTION_BUTTON_CLASSES =
  "inline-flex items-center justify-center gap-1 rounded-xl border border-gray-300 bg-white/80 px-3 py-2 text-sm font-medium text-gray-700 shadow-xs whitespace-nowrap transition-all hover:text-[var(--color-brand-blue)] hover:border-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue)]/10 active:text-[var(--color-brand-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]/35 focus-visible:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed";

export const PROFILE_CARD_SECONDARY_ACTION_BUTTON_CLASSES =
  "inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white/80 px-3 py-2.5 text-sm font-medium text-gray-700 shadow-xs transition-all hover:text-[var(--color-brand-blue)] hover:border-[var(--color-brand-blue)] hover:bg-[var(--color-brand-blue)]/10 active:text-[var(--color-brand-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]/35 focus-visible:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed";

export const PROFILE_CARD_PRIMARY_GREEN_ACTION_BUTTON_CLASSES =
  "inline-flex items-center justify-center rounded-xl border border-green-700/60 bg-green-50 px-3 py-2.5 text-sm font-semibold text-green-700 shadow-xs transition-all hover:border-green-700 hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/35 focus-visible:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed";

export const PROFILE_CARD_INLINE_SELECTOR_TRIGGER_CLASSES =
  "inline-flex items-center gap-1 rounded-lg border border-transparent bg-white/70 px-1.5 text-gray-600 shadow-xs transition-all hover:text-[var(--color-brand-blue)] hover:border-[var(--color-brand-blue)]/40 hover:bg-[var(--color-brand-blue)]/10 active:text-[var(--color-brand-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)]/35";

const PROFILE_CARD_TAP_MOTION_PROPS = {
  whileTap: { scale: 0.94, y: 1, filter: "brightness(0.95)" },
  transition: { type: "spring" as const, stiffness: 550, damping: 24, mass: 0.35 },
};

export function getProfileCardTapMotionProps(shouldReduceMotion: boolean) {
  return shouldReduceMotion ? {} : PROFILE_CARD_TAP_MOTION_PROPS;
}
