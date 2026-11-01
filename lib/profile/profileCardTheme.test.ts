import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PROFILE_CARD_BACKGROUND,
  DEFAULT_PROFILE_CARD_TEXT,
  DEFAULT_PROFILE_PAGE_BACKGROUND,
  resolveProfileCardColors,
  resolveProfileVisualTheme,
} from "./profileCardTheme.ts";

const defaultVisual = {
  packageId: null,
  packageLabel: null,
  cardSurface: DEFAULT_PROFILE_CARD_BACKGROUND,
  cardSurfaceSolid: DEFAULT_PROFILE_CARD_BACKGROUND,
  cardText: DEFAULT_PROFILE_CARD_TEXT,
  cardIsDark: false,
  pageBackground: DEFAULT_PROFILE_PAGE_BACKGROUND,
  borderColor: null,
};

test("unset ZNS card colors match non-ZNS cards", () => {
  const znsUnset = resolveProfileVisualTheme({
    hasDesignAccess: true,
    profileThemePackage: null,
    profileCardTheme: null,
    profilePageBackground: null,
    profileCardBorder: null,
  });
  const nonZns = resolveProfileVisualTheme({
    hasDesignAccess: false,
    profileThemePackage: "maxi_theme",
    profileCardTheme: "lavender",
    profilePageBackground: "rose",
    profileCardBorder: "noir",
  });

  assert.deepEqual(znsUnset, defaultVisual);
  assert.deepEqual(nonZns, defaultVisual);
  assert.equal(DEFAULT_PROFILE_CARD_BACKGROUND, "transparent");
});

test("explicit none and empty ZNS selections resolve to the same default", () => {
  const fromNone = resolveProfileVisualTheme({
    hasDesignAccess: true,
    profileThemePackage: "none",
    profileCardTheme: "none",
    profilePageBackground: "none",
    profileCardBorder: null,
  });
  const fromEmpty = resolveProfileVisualTheme({
    hasDesignAccess: true,
    profileThemePackage: "",
    profileCardTheme: "",
    profilePageBackground: "",
    profileCardBorder: "",
  });

  assert.deepEqual(fromNone, defaultVisual);
  assert.deepEqual(fromEmpty, defaultVisual);
  assert.deepEqual(resolveProfileCardColors(null), {
    theme: null,
    background: "transparent",
    text: DEFAULT_PROFILE_CARD_TEXT,
  });
});

test("ZNS custom theme and Zcash Theme still apply", () => {
  const lavender = resolveProfileVisualTheme({
    hasDesignAccess: true,
    profileCardTheme: "lavender",
  });
  assert.equal(lavender.cardSurface, "#d7e0ff");
  assert.equal(lavender.cardText, "#1f2a44");

  const zcashTheme = resolveProfileVisualTheme({
    hasDesignAccess: true,
    profileThemePackage: "maxi_theme",
    profileCardTheme: "lavender",
  });
  assert.equal(zcashTheme.packageId, "maxi_theme");
  assert.match(zcashTheme.cardSurface, /linear-gradient/);
});
