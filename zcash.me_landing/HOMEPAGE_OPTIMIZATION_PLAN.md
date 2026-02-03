# Homepage Performance & Animation Optimization Plan

## Overview

This document outlines a comprehensive plan to optimize the zcash.me homepage for faster loads/reloads and cleaner, more human-usable animations.

---

## Current State Analysis

### Architecture
- **Framework**: Next.js 14 (App Router, Server Components)
- **Main Component**: `src/Directory.jsx` (1685 lines)
- **Animation Library**: Framer Motion 12.23 + CSS keyframes
- **Styling**: Tailwind CSS 4.1

### Key Performance Issues Identified

#### 1. Animated Patterns - High DOM Count
The featured cards use 6 different animated pattern components that create excessive DOM elements:

| Pattern | Elements Created | Issue |
|---------|-----------------|-------|
| `AnimatedLines` | 16 divs | Individual transition delays |
| `AnimatedGrid` | 48 divs | `Math.random()` on hover causes re-renders |
| `AnimatedWaves` | 14 SVG paths | Complex path transitions |
| `AnimatedBlocks` | 96 divs (6×16) | `Math.random()` on hover |
| `AnimatedCircles` | 12 SVG circles | Individual transition delays |
| `AnimatedDots` | 35 divs | Individual transitions + transforms |

**Total potential elements**: ~221 animated elements across 6 cards = **1,326 animated DOM nodes**

#### 2. Auto-Rotation Causes Continuous State Updates
```javascript
// Current: 3.5s interval causing constant re-renders
useEffect(() => {
  const interval = setInterval(() => {
    setActiveCardIndex(prev => (prev + 1) % reorderedProfiles.length);
  }, 3500);
  return () => clearInterval(interval);
}, [reorderedProfiles.length, isInteracting]);
```

#### 3. Search Has No Debouncing
Every keystroke triggers:
- Full profile array filtering
- `useMemo` recalculation for `sorted`, `grouped`, `letters`
- Re-render of entire profile list

#### 4. Math.random() in Render Path
Several patterns use `Math.random()` during render, causing:
- Non-deterministic renders
- Inability to properly memoize
- Visual flickering

**Offending code examples:**
```javascript
// AnimatedGrid - line 46
backgroundColor: `rgba(0,0,0,${isHovering ? 0.1 + (Math.random() * 0.3) : ...})`

// AnimatedBlocks - line 100
backgroundColor: isHovering ? `rgba(0,80,60,${0.3 + Math.random() * 0.4})` : ...

// AnimatedDots - line 102
transition: `all 0.3s ease-out ${i * 0.015}s`
```

#### 5. Missing GPU Acceleration Hints
- No `transform: translateZ(0)` or `will-change` on animated cards
- No CSS containment (`contain: layout style paint`)
- Transitions use `all` instead of specific properties

#### 6. Excessive Transition Durations
Current durations feel sluggish:
- Card transforms: 0.5s
- Pattern transitions: 0.3-0.5s with staggered delays up to 0.7s total
- Auto-spotlight: 3.5s interval

---

## Optimization Plan

### Phase 1: Optimize Animated Patterns

**Goal**: Reduce DOM count by 60%, eliminate Math.random() from render

#### 1.1 Simplify AnimatedLines
```javascript
// BEFORE: 16 elements with individual calculations
[...Array(16)].map((_, i) => { ... })

// AFTER: 8 elements with CSS-only animation
function AnimatedLines({ isHovering }) {
  return (
    <div className={`animated-lines ${isHovering ? 'active' : ''}`}>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="line" style={{ '--i': i }} />
      ))}
    </div>
  );
}
```

#### 1.2 Replace AnimatedGrid with CSS Grid Pattern
```javascript
// BEFORE: 48 divs with random colors
// AFTER: Single div with CSS background pattern
function AnimatedGrid({ isHovering }) {
  return (
    <div
      className={`pattern-grid ${isHovering ? 'active' : ''}`}
      style={{
        backgroundImage: `repeating-linear-gradient(...)`,
        transition: 'opacity 0.2s, transform 0.3s'
      }}
    />
  );
}
```

#### 1.3 Reduce AnimatedBlocks
```javascript
// BEFORE: 96 elements (6 rows × 16 cols)
// AFTER: 24 elements (4 rows × 6 cols) with pre-computed colors
const BLOCK_COLORS = [...]; // Pre-computed, no Math.random()
```

#### 1.4 Simplify AnimatedDots
```javascript
// BEFORE: 35 dots with individual transitions
// AFTER: 16 dots with CSS animation classes
```

#### 1.5 Use CSS Animations Instead of Inline Styles
Add to `globals.css`:
```css
/* Pattern animations - GPU accelerated */
.pattern-container {
  contain: layout style paint;
  will-change: transform, opacity;
}

@keyframes lineGrow {
  from { transform: scaleY(0.5); }
  to { transform: scaleY(1); }
}

.animated-lines .line {
  transform-origin: bottom;
  animation: lineGrow 0.3s ease-out forwards;
  animation-delay: calc(var(--i) * 0.02s);
}
```

---

### Phase 2: Add Search Debouncing

**Goal**: Prevent filtering on every keystroke

#### 2.1 Create useDebounce Hook
```javascript
// src/hooks/useDebounce.js
import { useState, useEffect } from 'react';

export function useDebounce(value, delay = 150) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

#### 2.2 Apply to Search
```javascript
// In Directory.jsx
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 150);

// Use debouncedSearch for filtering
const { sorted, grouped, letters } = useMemo(() => {
  let s = [...processedProfiles].filter((p) =>
    p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );
  // ...
}, [processedProfiles, debouncedSearch, filters]);
```

---

### Phase 3: Optimize FeaturedCardsSection

**Goal**: Reduce re-renders, add GPU acceleration

#### 3.1 Memoize Card Components
```javascript
const MemoizedFannedCard = React.memo(FannedCard, (prev, next) => {
  return (
    prev.profile.id === next.profile.id &&
    prev.isActive === next.isActive &&
    prev.isSpotlit === next.isSpotlit &&
    prev.stackIndex === next.stackIndex
  );
});
```

#### 3.2 Use CSS Custom Properties for Transforms
```javascript
// BEFORE: Inline style calculations on every render
style={{
  transform: `translateX(${offset}px) translateY(${verticalOffset}px) rotate(${rotation}deg)`,
}}

// AFTER: CSS custom properties + class toggle
style={{
  '--card-offset': `${offset}px`,
  '--card-vertical': `${verticalOffset}px`,
  '--card-rotation': `${rotation}deg`,
}}
className={`fanned-card ${isHighlighted ? 'highlighted' : ''}`}
```

#### 3.3 Extend Auto-Rotation Interval
```javascript
// BEFORE: 3500ms (too fast, constant visual motion)
// AFTER: 5000ms (more relaxed, fewer state updates)
const interval = setInterval(() => {
  setActiveCardIndex(prev => (prev + 1) % reorderedProfiles.length);
}, 5000);
```

#### 3.4 Use requestAnimationFrame for Tilt
```javascript
const handleMouseMove = useCallback((e) => {
  if (!cardRef.current || isMobile) return;

  // Use rAF to batch DOM reads/writes
  requestAnimationFrame(() => {
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = (y - centerY) / centerY * -8; // Reduced from -10
    const tiltY = (x - centerX) / centerX * 8;  // Reduced from 10
    setTilt({ x: tiltX, y: tiltY });
  });
}, [isMobile]);
```

---

### Phase 4: CSS Performance Optimizations

**Goal**: Enable GPU acceleration, reduce paint operations

#### 4.1 Add to globals.css
```css
/* GPU acceleration for cards */
.fanned-card {
  contain: layout style;
  will-change: transform;
  transform: translateZ(0); /* Force GPU layer */
  backface-visibility: hidden;
}

.fanned-card.highlighted {
  will-change: transform, box-shadow;
}

/* Optimize sticky search bar */
.sticky-search {
  contain: layout style paint;
  will-change: transform, background-color;
}

/* Pattern containers */
.pattern-container {
  contain: strict;
  content-visibility: auto;
}

/* Reduce motion for users who prefer it */
@media (prefers-reduced-motion: reduce) {
  .fanned-card,
  .card-shimmer::before,
  .animated-lines .line,
  .pattern-grid {
    animation: none !important;
    transition-duration: 0.1s !important;
  }
}
```

#### 4.2 Use Specific Transition Properties
```css
/* BEFORE */
.transition-all {
  transition-property: all;
}

/* AFTER - Only animate what changes */
.card-transition {
  transition-property: transform, opacity, box-shadow;
  transition-duration: 0.25s;
  transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);
}
```

---

### Phase 5: Reduce Animation Durations

**Goal**: Make interactions feel snappier and more responsive

#### 5.1 Duration Changes

| Animation | Before | After | Reason |
|-----------|--------|-------|--------|
| Card transform | 0.5s | 0.25s | Snappier response |
| Card hover scale | 0.3s | 0.15s | Immediate feedback |
| Pattern transitions | 0.3-0.5s | 0.2s | Less waiting |
| Stagger delays | up to 0.7s | max 0.3s | Faster completion |
| Auto-spotlight | 3.5s | 5s | Less visual noise |
| Tilt response | 0.2s | 0.1s | More responsive |

#### 5.2 Update FannedCard Transitions
```javascript
// BEFORE
transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), z-index 0s'

// AFTER - Faster, simpler easing
transition: 'transform 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)'
```

#### 5.3 Reduce Cubic Bezier Bounciness
```javascript
// BEFORE - Very bouncy, slow to settle
cubic-bezier(0.34, 1.56, 0.64, 1)

// AFTER - Subtle ease-out, faster
cubic-bezier(0.25, 0.1, 0.25, 1)
```

---

### Phase 6: Memoize Pattern Components

**Goal**: Prevent re-renders when parent state changes

#### 6.1 Wrap All Patterns in React.memo
```javascript
const AnimatedLines = React.memo(function AnimatedLines({ isHovering }) {
  // ... component code
});

const AnimatedGrid = React.memo(function AnimatedGrid({ isHovering }) {
  // ... component code
});

// etc.
```

#### 6.2 Extract Pattern Selection to Avoid Re-creation
```javascript
// BEFORE: Function created on every render
const renderPattern = () => {
  switch (patternType) { ... }
};

// AFTER: Memoized component selection
const PatternComponent = useMemo(() => {
  const patterns = {
    lines: AnimatedLines,
    grid: AnimatedGrid,
    waves: AnimatedWaves,
    blocks: AnimatedBlocks,
    circles: AnimatedCircles,
    dots: AnimatedDots,
  };
  return patterns[patternType] || AnimatedLines;
}, [patternType]);

// Usage
<PatternComponent isHovering={patternActive} />
```

---

## Implementation Priority

### High Priority (Immediate Impact)
1. **Search debouncing** - Fixes lag on large profile counts
2. **Reduce animation durations** - Immediate UX improvement
3. **Remove Math.random() from render** - Fixes visual flickering

### Medium Priority (Performance)
4. **Memoize FannedCard** - Reduces re-renders
5. **Add CSS containment** - Improves paint performance
6. **Simplify pattern element counts** - Reduces DOM size

### Lower Priority (Polish)
7. **CSS-only pattern animations** - Better GPU utilization
8. **Extend auto-rotation interval** - Less visual noise
9. **prefers-reduced-motion support** - Accessibility

---

## Expected Results

| Metric | Before | After (Expected) |
|--------|--------|------------------|
| DOM elements (featured section) | ~1,326 | ~400 |
| Re-renders per second (idle) | ~0.3 | 0 |
| Time to first interaction | ~300ms | ~100ms |
| Animation jank (mobile) | Frequent | Rare |
| Search input lag | Noticeable | Imperceptible |

---

## Files to Modify

1. **`src/Directory.jsx`**
   - Add search debouncing
   - Memoize FannedCard
   - Reduce pattern element counts
   - Update transition durations
   - Remove Math.random() from render

2. **`app/globals.css`**
   - Add CSS containment rules
   - Add GPU acceleration hints
   - Add prefers-reduced-motion media query
   - Add optimized pattern animations

3. **`src/hooks/useDebounce.js`** (new file)
   - Debounce hook implementation

---

## Testing Checklist

- [ ] Profile list filters correctly with debounced search
- [ ] Featured cards animate smoothly on mobile
- [ ] No visual flickering on pattern hover
- [ ] Card tilt feels responsive
- [ ] Auto-rotation doesn't cause jank
- [ ] Sticky search bar transitions smoothly
- [ ] Reduced motion preference is respected
- [ ] No console warnings about memoization
