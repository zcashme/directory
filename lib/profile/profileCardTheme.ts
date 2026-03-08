export type ProfileCardThemeId =
  | "lavender"
  | "rose"
  | "sky_blue"
  | "cream"
  | "slate"
  | "noir";

export type ProfilePageBackgroundId = ProfileCardThemeId;

export interface ProfileCardThemeDefinition {
  id: ProfileCardThemeId;
  label: string;
  background: string;
  text: string;
  isDark: boolean;
}

export const PROFILE_CARD_THEMES: readonly ProfileCardThemeDefinition[] = [
  { id: "lavender", label: "Lavender", background: "#d7e0ff", text: "#1f2a44", isDark: false },
  { id: "rose", label: "Rose", background: "#f7c3d5", text: "#4b2633", isDark: false },
  { id: "sky_blue", label: "Sky Blue", background: "#bfe7ff", text: "#17364a", isDark: false },
  { id: "cream", label: "Cream", background: "#f2ece0", text: "#3b3528", isDark: false },
  { id: "slate", label: "Slate", background: "#4d5058", text: "#f2f3f5", isDark: true },
  { id: "noir", label: "Noir", background: "#16181c", text: "#f5f6f8", isDark: true },
] as const;

export const DEFAULT_PROFILE_CARD_BACKGROUND = "#ffffff";
export const DEFAULT_PROFILE_CARD_TEXT = "#111827";
export const DEFAULT_PROFILE_PAGE_BACKGROUND = "#faf6ed";

const THEME_ID_LOOKUP = new Map(
  PROFILE_CARD_THEMES.map((theme) => [theme.id, theme] as const)
);

export function normalizeProfileCardThemeId(value: unknown): ProfileCardThemeId | null {
  if (typeof value !== "string") return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (!normalized) return null;

  return THEME_ID_LOOKUP.has(normalized as ProfileCardThemeId)
    ? (normalized as ProfileCardThemeId)
    : null;
}

export function normalizeProfilePageBackgroundId(value: unknown): ProfilePageBackgroundId | null {
  return normalizeProfileCardThemeId(value);
}

export function getProfileCardTheme(value: unknown): ProfileCardThemeDefinition | null {
  const normalized = normalizeProfileCardThemeId(value);
  if (!normalized) return null;
  return THEME_ID_LOOKUP.get(normalized) ?? null;
}

export function getProfilePageBackground(value: unknown): ProfileCardThemeDefinition | null {
  const normalized = normalizeProfilePageBackgroundId(value);
  if (!normalized) return null;
  return THEME_ID_LOOKUP.get(normalized) ?? null;
}

export function resolveProfileCardColors(value: unknown): {
  theme: ProfileCardThemeDefinition | null;
  background: string;
  text: string;
} {
  const theme = getProfileCardTheme(value);
  if (!theme) {
    return {
      theme: null,
      background: DEFAULT_PROFILE_CARD_BACKGROUND,
      text: DEFAULT_PROFILE_CARD_TEXT,
    };
  }

  return {
    theme,
    background: theme.background,
    text: theme.text,
  };
}

export function resolveProfilePageBackgroundColor(value: unknown): {
  theme: ProfileCardThemeDefinition | null;
  background: string;
} {
  const theme = getProfilePageBackground(value);
  if (!theme) {
    return {
      theme: null,
      background: DEFAULT_PROFILE_PAGE_BACKGROUND,
    };
  }

  return {
    theme,
    background: theme.background,
  };
}
