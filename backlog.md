# Backlog

## Refactoring Tasks

### Extract Route Navigation Progress Bar Logic
**File:** `ui/profile/ProfileHeader.tsx`

ProfileHeader is currently managing two separate concerns:
1. Join modal state (`isJoinOpen`, form management)
2. Route navigation progress bar animation (8 refs managing animation frames, timeouts, and state syncing)

**The Problem:**
- 8 refs (`routeNavigationAnimationFrameRef`, `routeNavigationResetTimeoutRef`, `routeNavigationFallbackTimeoutRef`, etc.)
- Complex animation lifecycle management mixed with modal logic
- Hard to test and maintain

**Solution:**
- Extract all route navigation progress logic into a custom hook or separate component
- Keep ProfileHeader focused on header UI and modal management
- Makes the codebase cleaner and easier to reason about

**Estimated Effort:** Medium (1-2 hours)

### Search State Ownership in ProfileHeader
**File:** `ui/profile/ProfileHeader.tsx`

**The Problem:**
`resetSearch` (which clears the header search input) was previously coupled to `closeForm` — the function that closed the join modal. Now that the join modal state lives in `JoinModalContext`, ProfileHeader has lost its natural hook into the "modal closed" event. The search state (`search`, `setSearch`) is a local ProfileHeader concern but its reset was tied to a flow that is now managed externally.

**Why it matters:**
This coupling reveals that search state and modal state were entangled in ProfileHeader without a clear ownership boundary. Moving modal state to context exposed this hidden dependency.
