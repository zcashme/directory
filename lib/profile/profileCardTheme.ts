export type ProfileCardThemeId =
  | "lavender"
  | "rose"
  | "sky_blue"
  | "cream"
  | "slate"
  | "noir";

export type ProfileCardThemeSelectionId = ProfileCardThemeId | "none";
export type ProfilePageBackgroundId = ProfileCardThemeId;
export type ProfilePageBackgroundSelectionId = ProfilePageBackgroundId | "none";
export type ProfileCardBorderId = ProfileCardThemeId;
export type ProfileCardBorderSelectionId = ProfileCardBorderId | "none";
export type ProfileThemePackageId = "maxi_theme";
export type ProfileThemePackageSelectionId = ProfileThemePackageId | "none";

export interface ProfileCardThemeDefinition {
  id: ProfileCardThemeId;
  label: string;
  background: string;
  text: string;
  isDark: boolean;
}

export interface ProfileCardBorderDefinition {
  id: ProfileCardBorderSelectionId;
  label: string;
  color: string;
}

export interface ProfileThemePackageDefinition {
  id: ProfileThemePackageId;
  label: string;
  cardSurface: string;
  cardSurfaceSolid: string;
  cardText: string;
  isDark: boolean;
  pageBackground: string;
  borderColor: string;
}

export interface ResolvedProfileVisualTheme {
  packageId: ProfileThemePackageId | null;
  packageLabel: string | null;
  cardSurface: string;
  cardSurfaceSolid: string;
  cardText: string;
  cardIsDark: boolean;
  pageBackground: string;
  borderColor: string | null;
}

export const PROFILE_CARD_THEMES: readonly ProfileCardThemeDefinition[] = [
  { id: "lavender", label: "Lavender", background: "#d7e0ff", text: "#1f2a44", isDark: false },
  { id: "rose", label: "Rose", background: "#f7c3d5", text: "#4b2633", isDark: false },
  { id: "sky_blue", label: "Sky Blue", background: "#bfe7ff", text: "#17364a", isDark: false },
  { id: "cream", label: "Cream", background: "#f2ece0", text: "#3b3528", isDark: false },
  { id: "slate", label: "Slate", background: "#4d5058", text: "#f2f3f5", isDark: true },
  { id: "noir", label: "Noir", background: "#16181c", text: "#f5f6f8", isDark: true },
] as const;

export const PROFILE_THEME_PACKAGES: readonly ProfileThemePackageDefinition[] = [
  {
    id: "maxi_theme",
    label: "Maxi Theme",
    cardSurface:
      "linear-gradient(155deg, rgba(12,112,65,0.96) 0%, rgba(14,145,89,0.95) 44%, rgba(176,173,33,0.86) 100%)",
    cardSurfaceSolid: "#11824f",
    cardText: "#fdf5c7",
    isDark: true,
    pageBackground: "#faf6ed",
    borderColor: "rgba(253, 230, 138, 0.7)",
  },
] as const;

export const DEFAULT_PROFILE_CARD_BACKGROUND = "#ffffff";
export const DEFAULT_PROFILE_CARD_TEXT = "#111827";
export const DEFAULT_PROFILE_PAGE_BACKGROUND = "#faf6ed";

const THEME_ID_LOOKUP = new Map(
  PROFILE_CARD_THEMES.map((theme) => [theme.id, theme] as const)
);
const THEME_PACKAGE_ID_LOOKUP = new Map(
  PROFILE_THEME_PACKAGES.map((themePackage) => [themePackage.id, themePackage] as const)
);

function normalizeSelection(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return normalized || null;
}

export function normalizeProfileCardThemeId(value: unknown): ProfileCardThemeId | null {
  const normalized = normalizeSelection(value);
  if (!normalized) return null;

  return THEME_ID_LOOKUP.has(normalized as ProfileCardThemeId)
    ? (normalized as ProfileCardThemeId)
    : null;
}

export function normalizeProfileCardThemeSelectionId(value: unknown): ProfileCardThemeSelectionId | null {
  const normalized = normalizeSelection(value);
  if (!normalized) return null;
  if (normalized === "none") return "none";
  return normalizeProfileCardThemeId(normalized);
}

export function normalizeProfileThemePackageId(value: unknown): ProfileThemePackageId | null {
  const normalized = normalizeSelection(value);
  if (!normalized) return null;
  return THEME_PACKAGE_ID_LOOKUP.has(normalized as ProfileThemePackageId)
    ? (normalized as ProfileThemePackageId)
    : null;
}

export function normalizeProfileThemePackageSelectionId(value: unknown): ProfileThemePackageSelectionId | null {
  const normalized = normalizeSelection(value);
  if (!normalized) return null;
  if (normalized === "none") return "none";
  return normalizeProfileThemePackageId(normalized);
}

export function normalizeProfilePageBackgroundId(value: unknown): ProfilePageBackgroundSelectionId | null {
  const normalized = normalizeProfileCardThemeSelectionId(value);
  if (!normalized) return null;
  return normalized;
}

export function getProfileCardTheme(value: unknown): ProfileCardThemeDefinition | null {
  const normalized = normalizeProfileCardThemeSelectionId(value);
  if (!normalized) return null;
  if (normalized === "none") return null;
  return THEME_ID_LOOKUP.get(normalized) ?? null;
}

export function getProfileThemePackage(value: unknown): ProfileThemePackageDefinition | null {
  const normalized = normalizeProfileThemePackageSelectionId(value);
  if (!normalized || normalized === "none") return null;
  return THEME_PACKAGE_ID_LOOKUP.get(normalized) ?? null;
}

export function getProfilePageBackground(value: unknown): ProfileCardThemeDefinition | null {
  const normalized = normalizeProfilePageBackgroundId(value);
  if (!normalized) return null;
  if (normalized === "none") return null;
  return THEME_ID_LOOKUP.get(normalized) ?? null;
}

export function normalizeProfileCardBorderId(value: unknown): ProfileCardBorderSelectionId | null {
  const normalized = normalizeProfileCardThemeSelectionId(value);
  if (!normalized) return null;
  return normalized;
}

export function getProfileCardBorder(value: unknown): ProfileCardBorderDefinition | null {
  const normalized = normalizeProfileCardBorderId(value);
  if (!normalized) return null;
  if (normalized === "none") {
    return {
      id: "none",
      label: "None",
      color: "transparent",
    };
  }
  const theme = THEME_ID_LOOKUP.get(normalized);
  if (!theme) return null;
  return {
    id: theme.id,
    label: theme.label,
    color: theme.background,
  };
}

export function resolveProfileCardColors(value: unknown): {
  theme: ProfileCardThemeDefinition | null;
  background: string;
  text: string;
} {
  const normalized = normalizeProfileCardThemeSelectionId(value);
  if (normalized === "none") {
    return {
      theme: null,
      background: "transparent",
      text: DEFAULT_PROFILE_CARD_TEXT,
    };
  }
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
  const normalized = normalizeProfilePageBackgroundId(value);
  if (normalized === "none") {
    return {
      theme: null,
      background: DEFAULT_PROFILE_PAGE_BACKGROUND,
    };
  }
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

interface ResolveProfileVisualThemeInput {
  isMaxi: boolean;
  profileThemePackage?: unknown;
  profileCardTheme?: unknown;
  profilePageBackground?: unknown;
  profileCardBorder?: unknown;
}

export function resolveProfileVisualTheme({
  isMaxi,
  profileThemePackage,
  profileCardTheme,
  profilePageBackground,
  profileCardBorder,
}: ResolveProfileVisualThemeInput): ResolvedProfileVisualTheme {
  if (isMaxi) {
    const themePackage = getProfileThemePackage(profileThemePackage);
    if (themePackage) {
      return {
        packageId: themePackage.id,
        packageLabel: themePackage.label,
        cardSurface: themePackage.cardSurface,
        cardSurfaceSolid: themePackage.cardSurfaceSolid,
        cardText: themePackage.cardText,
        cardIsDark: themePackage.isDark,
        pageBackground: themePackage.pageBackground,
        borderColor: themePackage.borderColor,
      };
    }
  }

  const cardTheme = resolveProfileCardColors(isMaxi ? profileCardTheme : "none");
  const pageTheme = resolveProfilePageBackgroundColor(isMaxi ? profilePageBackground : "none");
  const borderColor = getProfileCardBorder(isMaxi ? profileCardBorder : null)?.color ?? null;
  const cardSurface = cardTheme.background;

  return {
    packageId: null,
    packageLabel: null,
    cardSurface,
    cardSurfaceSolid: cardSurface,
    cardText: cardTheme.text,
    cardIsDark: Boolean(cardTheme.theme?.isDark),
    pageBackground: pageTheme.background,
    borderColor,
  };
}
