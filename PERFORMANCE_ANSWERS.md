# Answers to Performance Questions

## 1. Why do we need memoization? Can't we just clean up the code?

**You're absolutely right!** Memoization is a band-aid. If we fix the root causes, we might not need it.

**The real issue:** Looking at `ProfilePageClient`, it uses `useFeedback()` which pulls from multiple React contexts. If those contexts update frequently, ProfileCard re-renders unnecessarily.

**Better approach:** Fix the root causes:
- Fix the event listener re-registration issue (see #8 below)
- Clean up expensive calculations
- Optimize animations

**When memoization IS useful:** Only if the parent component (`ProfilePageClient`) updates frequently for reasons unrelated to the profile (like global UI state). But if we fix the code properly, those updates shouldn't cause unnecessary ProfileCard re-renders anyway.

**Verdict:** Skip memoization, fix the code instead. ✅

---

## 2. 3D Flip - Keep it but make it fast

**Current:** `duration-500` (500ms) feels slow and janky.

**Fix:**
- Reduce to `duration-300` (300ms) - feels snappy
- Add GPU acceleration hints
- Keep the 3D effect, just make it smoother

**Code change:**
```jsx
<div
  className={`relative transition-transform duration-300 transform-style-preserve-3d ${showBack ? "rotate-y-180" : ""}`}
  style={{
    position: "relative",
    height: "auto",
    transformOrigin: "top center",
    willChange: "transform", // Hint to browser
    transform: "translateZ(0)", // Force GPU layer
  }}
>
```

This keeps the 3D flip effect but makes it fast and smooth. ✅

---

## 3. Framer Motion - Remove if it still looks good

**What Framer Motion is doing:**
1. **Hover scale effect** (`whileHover={{ scale: 1.02 }}`) - Can be pure CSS
2. **Shimmer animation** - Can be CSS `@keyframes`

**Can we remove it?** Yes! Both effects can be done with CSS.

**CSS replacement:**
```css
/* Hover scale - replace Framer Motion */
.profile-card-wrapper {
  transition: transform 0.2s ease-out;
  transform: translateZ(0); /* GPU acceleration */
}

.profile-card-wrapper:hover {
  transform: scale(1.02) translateZ(0);
}

/* Shimmer - replace Framer Motion */
@keyframes shimmer {
  0% { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
}

.shimmer-bg {
  background-size: 200% 200%;
  animation: shimmer 6s linear infinite;
}
```

**Benefits:**
- Removes ~50KB from bundle
- Better performance (CSS animations are GPU-accelerated)
- Looks identical

**Verdict:** Remove Framer Motion, use CSS instead. ✅

---

## 4. What is backdrop-blur and what does it add?

**What it does:** `backdrop-blur` is a CSS filter that blurs everything **behind** the element (not the element itself). It creates a "frosted glass" effect.

**Visual effect:** Makes content behind the card look blurred/frosted, giving depth and focus to the card.

**Performance cost:** It's one of the most expensive CSS operations because:
- Browser must render everything behind the element
- Then apply blur filter to that rendered content
- Then composite it all together

**Where it's used in ProfileCard:**
1. Modal overlays (`backdrop-blur-xs` on modals) - **Needed** for visual effect
2. Card wrapper (`backdrop-blur-xs`) - **Might not be needed** if card has solid background
3. Links tray (`backdrop-blur-xs`) - **Might not be needed**

**Recommendation:**
- Keep backdrop-blur on modals (visual requirement)
- Remove from card wrapper if it has solid background (performance win)
- Remove from links tray if not visually necessary

**Test:** Remove backdrop-blur from card wrapper and see if it still looks good. If the card has a solid background, you won't notice the difference.

---

## 5. Always rendering ProfileEditor - might need that

**You're right!** If ProfileEditor maintains form state (user's edits), lazy loading would lose that state when flipping back.

**Current behavior:** ProfileEditor is always in DOM, just hidden with CSS (`absolute` positioning when `showBack === false`).

**Why this might be needed:**
- Preserves form state when flipping card
- Instant flip (no loading delay)
- User can edit, flip to front, flip back, and edits are still there

**Performance cost:** ProfileEditor is heavy (~800 lines, lots of state), but if you need state persistence, this is the right trade-off.

**Alternative (if state persistence isn't needed):**
- Use `{showBack && <ProfileEditor />}` for lazy loading
- But user loses edits when flipping away

**Verdict:** Keep always-rendering if you need state persistence. The performance cost is acceptable for the UX benefit. ✅

---

## 6. What is the dynamic import used for?

**Location:** `lib/profile/useProfileLinks.js:35`

```jsx
import("@/lib/supabase/supabase-client").then(async ({ supabase }) => {
  // ... database query
});
```

**What it does:** Dynamically imports the Supabase client only when needed (code-splitting).

**The problem:** It's inside `useEffect`, so:
- Runs on every effect execution
- Adds latency (import + database query)
- No caching - re-imports every time

**Why it was done this way:** Probably to avoid loading Supabase client on initial page load (only load when viewing a profile).

**Better approach:**
```jsx
// At module level (outside component)
import { supabase } from "@/lib/supabase/supabase-client";

// Then in useEffect, just use it directly
useEffect(() => {
  // ... use supabase directly, no dynamic import
}, [deps]);
```

**Or if you really need code-splitting:**
- Move dynamic import outside useEffect
- Cache the promise
- Only import once

**Current impact:** Adds ~50-100ms latency to every profile load because of the dynamic import + database query.

**Verdict:** Move import to module level, or cache the import promise. The current approach adds unnecessary latency. ✅

---

## 7. Why multiple event listeners?

**The problem:** `useProfileEvents` has too many dependencies, causing frequent re-registration:

```jsx
useEffect(() => {
  // ... create handlers
  window.addEventListener("enterSignInMode", handleEnterSignIn);
  window.addEventListener("enterDraftMode", handleEnterDraft);
  return () => {
    window.removeEventListener("enterSignInMode", handleEnterSignIn);
    window.removeEventListener("enterDraftMode", handleEnterDraft);
  };
}, [profile?.id, profile?.address, profile?.name, profile?.joined_at, profile?.created_at, profile?.since, profile?.address_verified]);
// ^^^ Too many dependencies!
```

**What happens:**
1. Profile object changes (even slightly)
2. useEffect re-runs
3. Old listeners removed, new ones added
4. Handlers recreated (new function references)
5. This happens frequently, causing overhead

**Why it was done this way:** The handlers capture profile values in closure, so when profile changes, new handlers are created with new values.

**Better approach:** Use refs to store stable handlers:

```jsx
export default function useProfileEvents(profile) {
  const [showBack, setShowBack] = useState(false);

  // Store profile values in refs (don't trigger re-renders)
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    const handleEnterSignIn = (e) => {
      setShowBack(true);
      const p = profileRef.current; // Get latest from ref

      if (!e?.detail && p?.id && p?.address) {
        window.dispatchEvent(
          new CustomEvent("enterSignInMode", {
            detail: {
              zId: p.id,
              address: p.address,
              name: p.name,
              verified: !!p.address_verified,
              since: p.joined_at || p.created_at || p.since || null,
            },
          })
        );
      }
    };

    const handleEnterDraft = () => {
      setShowBack(false);
    };

    // Only register once!
    window.addEventListener("enterSignInMode", handleEnterSignIn);
    window.addEventListener("enterDraftMode", handleEnterDraft);

    return () => {
      window.removeEventListener("enterSignInMode", handleEnterSignIn);
      window.removeEventListener("enterDraftMode", handleEnterDraft);
    };
  }, []); // Empty deps - only register once!

  return { showBack, setShowBack };
}
```

**Benefits:**
- Listeners registered once (not re-registered on every profile change)
- Handlers use refs to get latest profile values
- Much less overhead

**Verdict:** Fix the event listener re-registration issue. This is a real performance problem. ✅

---

## Summary: What to Actually Fix

### 🔴 Do These (Real Issues):

1. **Fix event listener re-registration** - Use refs, register once
2. **Speed up 3D flip** - `duration-300` + GPU hints
3. **Remove Framer Motion** - Replace with CSS (saves 50KB + better performance)
4. **Fix dynamic import** - Move to module level or cache
5. **Remove unnecessary backdrop-blur** - Test if card wrapper needs it

### 🟡 Consider These:

6. **Memoize expensive calculations** - Only if they're actually slow (measure first)
7. **Optimize useProfileLinks** - Add caching if database queries are slow

### ⚪ Skip These:

- ❌ **Memoization of ProfileCard** - Not needed if we fix root causes
- ❌ **Lazy load ProfileEditor** - Keep always-rendering for state persistence

---

## The Real Performance Wins

1. **Event listener fix** - Eliminates frequent re-registration overhead
2. **Remove Framer Motion** - 50KB bundle + better runtime performance
3. **Faster flip animation** - Better UX (300ms vs 500ms)
4. **Fix dynamic import** - Removes 50-100ms latency

These four fixes will make the biggest difference, and they're all code cleanup (not band-aids like memoization).
