# Sidebar & Footer Pull Tab — Audit

## Problems

### 1. No focus trap — 29 focusable elements behind the backdrop
When the sidebar is open, **29 interactive elements** (links, buttons, inputs) on the page remain tabbable behind the backdrop. A user pressing Tab will cycle through profile cards, the search bar, footer links, etc. while the sidebar is visually covering them. The backdrop blocks pointer events (`z-index: 1190`) but doesn't trap keyboard focus.

### 2. Body scroll not locked when open
`bodyOverflow: { overflow: "hidden auto", overflowY: "auto" }` — the page remains scrollable behind the open sidebar. On mobile, a user swiping the backdrop area will scroll the homepage content underneath.

### 3. Phantom 22px bottom gap on non-homepage routes
On `/terms` (no fixed footer), the sidebar container still has `bottom: 22px`. That's the hardcoded `footerSafeGap = 22` from `FloatingSidebarMenu.tsx:108`. The `updateLayout` function finds no fixed footer, gets `footerHeight = 0`, but still adds `0 + 22 = 22px` of dead space at the bottom. The sidebar is needlessly shortened on every non-homepage route.

### 4. Three z-[1200] elements competing in the same stacking layer

| Element                  | Position | z-index |
| ------------------------ | -------- | ------- |
| Header (`sticky top-0`)  | sticky   | 1200    |
| Sidebar container        | fixed    | 1200    |
| Footer (homepage only)   | fixed    | 1200    |

Same z-index means paint order is determined by DOM order, which is fragile. The header is `sticky` (not `fixed`), so it participates in a different stacking context than the two `fixed` elements — their overlap behavior is coincidental, not intentional.

### 5. Footer measurement via blind DOM query
`FloatingSidebarMenu.tsx:105-106`:
```ts
const footerEls = Array.from(document.querySelectorAll("footer")) as HTMLElement[];
const fixedFooter = footerEls.find((el) => getComputedStyle(el).position === "fixed");
```
This scans every `<footer>` in the DOM and checks computed styles. It's brittle — if any other page adds a `<footer>` (even a non-fixed one), or if the homepage footer's CSS changes, this silently breaks. The sidebar and footer have no shared contract; they communicate through DOM scraping.

### 6. Pull tab anchored to left edge (design oddity)
The pull tab sits at `left: 0` (viewport left edge) on all pages. The panel slides out from the left, pushing the tab rightward to `x: 396`. This means:
- **Closed state**: a 32px-wide tab hugs the far left — easy to miss, especially on desktop where left-edge UI is unusual.
- **Open state**: the tab moves to `x: 396` (middle-ish) — its position is unpredictable.

### 7. All 8 menu items are `disabled` + `comingSoon`
Every single item in the sidebar is disabled. The menu opens, shows 8 items, and the user can interact with none of them. This is shipping UI chrome with zero functionality — the sidebar is currently a dead end.

---

## Involved Files

### Core Components

| File | Role |
| ---- | ---- |
| `ui/common/layout/FloatingSidebarMenu.tsx` | **The sidebar.** Defines the slide-out panel, pull tab, backdrop, drag behavior, keyboard navigation. Uses `id="floating-sidebar-menu"`, `z-[1200]` container, `z-[1190]` backdrop. DOM-queries `[data-global-header]` and all `<footer>` elements to compute offsets. |
| `app/HomePage.tsx` | **The homepage footer.** Fixed footer with social-link pull tab (`data-home-footer-tab`). Uses `z-[1200]`, `footerRef`/`footerTabRef` refs. Defines `SOCIAL_LINKS` (X, Discord, GitHub). Also queries `[data-global-header]` for layout spacing. |
| `ui/profile/ProfileHeader.tsx` | **The global header.** Sticky header with search bar and "Join" button. Exposes `data-global-header` attribute and uses `z-[1200]`. Both the sidebar and homepage footer measure this element's height. |
| `app/layout.tsx` | **Root layout.** Imports and renders `<ProfileHeader>` and `<FloatingSidebarMenu>` globally (every route). The sidebar lives here; the footer does not. |
| `app/globals.css` | **Global styles.** Defines CSS variables, animations, and a rule `body.is-not-found [data-global-header] { display: none !important; }` that hides the header on 404 pages. |

### Relationship Map

```
app/layout.tsx
├── <ProfileHeader />          ← ui/profile/ProfileHeader.tsx
│     └── data-global-header        (measured by sidebar + homepage)
├── <FloatingSidebarMenu />    ← ui/common/layout/FloatingSidebarMenu.tsx
│     ├── DOM queries [data-global-header]   (header height)
│     └── DOM queries all <footer>           (footer height — blind scan)
└── {children}
      └── (on "/" route) <HomePage />   ← app/HomePage.tsx
            └── <footer> z-[1200]       (measured by sidebar via DOM query)
                  └── data-home-footer-tab   (only used internally by HomePage)
```

### Z-Index Stack (descending paint order)

```
z-[1200]  ProfileHeader     (sticky, DOM order 1st)
z-[1200]  Sidebar container (fixed,  DOM order 2nd)
z-[1200]  Homepage footer   (fixed,  DOM order 3rd — only on "/" route)
z-[1190]  Sidebar backdrop  (fixed,  only when open)
```

### Data Attributes Used for Cross-Component Coupling

| Attribute | Set by | Read by |
| --------- | ------ | ------- |
| `data-global-header` | `ProfileHeader.tsx` | `FloatingSidebarMenu.tsx`, `HomePage.tsx` |
| `data-home-footer-tab` | `HomePage.tsx` | `HomePage.tsx` (internal only) |

### Measurement Flow

1. `FloatingSidebarMenu` runs `updateLayout()` on mount + resize.
2. Queries `[data-global-header]` → gets header height → sets `top` offset.
3. Queries `document.querySelectorAll("footer")` → finds first fixed one → gets height.
4. Adds hardcoded `footerSafeGap = 22` → sets `bottom` offset.
5. On non-homepage routes, no fixed footer exists → `bottom = 0 + 22 = 22px` (phantom gap).
