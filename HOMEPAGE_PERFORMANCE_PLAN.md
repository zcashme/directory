# Homepage Performance Optimization Plan

## Overview
The zcash.me homepage has several performance bottlenecks causing slow render times. This document outlines the issues identified and the recommended fixes.

---

## Issues Identified

### 1. Client-Side Data Fetching (CRITICAL)
**File:** `app/HomePage.jsx`, `lib/directory/useProfiles.js`

**Problem:** The entire homepage is a `"use client"` component that fetches ALL profiles (1000+) on the client after mount. This causes:
- Empty page on initial load
- 4 parallel Supabase requests on every page visit
- No caching between visits

**Solution:**
- Move profile fetching to server-side in `app/page.jsx`
- Use Next.js `unstable_cache` with 60-second revalidation
- Pass pre-fetched data to client component as props

```javascript
// app/page.jsx
import { fetchProfiles, getFeaturedProfiles } from "@/lib/directory/fetchProfiles";

export const revalidate = 60;

export default async function Page() {
  const profiles = await fetchProfiles();
  const featuredProfiles = await getFeaturedProfiles(profiles, 6);

  return (
    <HomePage
      initialProfiles={profiles}
      initialFeaturedProfiles={featuredProfiles}
    />
  );
}
```

---

### 2. Expensive Favicon Requests (HIGH)
**File:** `app/HomePage.jsx` (lines ~175-180 and ~341-346)

**Problem:** Each profile card link fetches a favicon from Google's API:
```javascript
faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
```
With 6 featured cards showing 2-3 links each, this creates 12-18 HTTP requests on load.

**Solution:** Replace favicon API calls with a simple link icon SVG:
```javascript
// Instead of fetching favicon, use provided icon or fallback SVG
const iconSrc = link.icon?.src || link.icon || null;
{iconSrc ? (
  <img src={iconSrc} ... />
) : (
  <svg className="w-3 h-3 text-gray-400">
    <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4..." />
  </svg>
)}
```

---

### 3. No Search Debouncing (MEDIUM)
**File:** `ui/profile/ProfileSearchDropdown.jsx`

**Problem:** Every keystroke filters through 1000+ profiles immediately, causing UI lag.

**Solution:** Add debouncing and memoization:
```javascript
function useDebouncedValue(value, delay = 150) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// Use debounced value for filtering
const debouncedValue = useDebouncedValue(value, 150);
const q = normalizeSearch(debouncedValue);

// Memoize the filtered results
const prioritized = useMemo(() => {
  if (!q) return [];
  // ... filtering logic
}, [q, profiles]);
```

---

### 4. Framer-Motion Bundle Size (MEDIUM)
**File:** `app/HomePage.jsx`

**Problem:** `framer-motion` adds ~40KB gzipped to the bundle for simple animations:
- Hero card fade-in
- "How it works" section animations
- Footer link hover effects

**Solution:** Replace with CSS animations:
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeInUp {
  animation: fadeInUp 0.6s ease-out forwards;
}
```

```javascript
// Before
<motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>

// After
<div className="animate-fadeInUp">
```

---

### 5. Profile Images Not Optimized (MEDIUM)
**File:** `app/HomePage.jsx`

**Problem:** Profile avatars use raw `<img>` tags without:
- Lazy loading
- Width/height attributes (causes layout shift)
- Next.js Image optimization

**Solution:** Use Next.js Image component:
```javascript
import Image from "next/image";

// Before
<img src={profile.profile_image_url} alt={profile.name} className="w-full h-full object-cover" />

// After
<Image
  src={profile.profile_image_url}
  alt={profile.name}
  width={80}
  height={80}
  className="w-full h-full object-cover"
  loading="lazy"
/>
```

Note: Requires configuring `next.config.mjs` for external image domains.

---

### 6. Scroll Event Performance (LOW)
**File:** `app/HomePage.jsx`

**Problem:** Scroll listener doesn't use passive flag:
```javascript
window.addEventListener("scroll", handleScroll);
```

**Solution:** Add passive flag for better scroll performance:
```javascript
window.addEventListener("scroll", handleScroll, { passive: true });
```

---

## Implementation Priority

| Priority | Task | Impact | Effort |
|----------|------|--------|--------|
| 1 | Server-side data fetching with caching | HIGH | Medium |
| 2 | Remove favicon API requests | HIGH | Low |
| 3 | Add search debouncing | MEDIUM | Low |
| 4 | Replace framer-motion with CSS | MEDIUM | Medium |
| 5 | Optimize images with Next.js Image | MEDIUM | Medium |
| 6 | Add passive scroll listener | LOW | Low |

---

## Expected Improvements

- **Time to First Contentful Paint (FCP):** 40-60% faster
- **Largest Contentful Paint (LCP):** 30-50% faster
- **Total Blocking Time (TBT):** 20-30% reduction
- **Bundle Size:** ~40KB reduction (framer-motion removal)
- **Network Requests:** 12-18 fewer requests per page load

---

## Files to Modify

1. `app/page.jsx` - Add server-side data fetching
2. `app/HomePage.jsx` - Accept props, remove framer-motion, fix images
3. `ui/profile/ProfileSearchDropdown.jsx` - Add debouncing
4. `lib/directory/fetchProfiles.js` - New file for server-side fetching
5. `next.config.mjs` - Add image domain configuration
6. `app/globals.css` or Tailwind config - Add CSS animations

---

## New File: lib/directory/fetchProfiles.js

```javascript
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { unstable_cache } from "next/cache";

async function fetchProfilesInternal() {
  const supabase = createSupabaseServerClient();

  // Fetch leaderboards and profiles in parallel
  const [{ data: lbAll }, { data: lbWeek }, { data: lbMonth }] = await Promise.all([
    supabase.from("referrer_ranked_alltime").select("*").limit(10),
    supabase.from("referrer_ranked_weekly").select("*").limit(10),
    supabase.from("referrer_ranked_monthly").select("*").limit(10),
  ]);

  // Fetch all profiles with pagination
  let all = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, count } = await supabase
      .from("zcasher_searchable")
      .select("*", { count: "exact" })
      .range(from, from + pageSize - 1);

    all = all.concat(data || []);
    if (!data?.length || all.length >= count) break;
    from += pageSize;
  }

  // Enrich with rank data and return
  return all.map(p => ({ ...p, /* enrichment */ }));
}

export const fetchProfiles = unstable_cache(
  fetchProfilesInternal,
  ["homepage-profiles"],
  { revalidate: 60, tags: ["profiles"] }
);

export async function getFeaturedProfiles(profiles, count = 6) {
  const featured = profiles.filter(p => p.featured);
  const source = featured.length > 0 ? featured : profiles;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
```
