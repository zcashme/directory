# Architecture Refactoring Plan: Move Data Fetching from UI to App Layer

## Context

Currently, UI components are directly importing and calling database queries, mutations, and Supabase client methods. This violates separation of concerns and makes components harder to test and reason about.

## Architectural Principle

**Chosen Pattern: Option 1 - Flat structure with convention**

```
lib/
  profile/profileUtils.js      ← utils (ui/ can import)
  profile/profileQueries.js    ← queries (only app/ imports)
  zcash/zcashUtils.js          ← utils (ui/ can import)
  supabase/supabase-client.js  ← queries (only app/ imports)
```

**Convention:**
- `ui/` components can ONLY import files named `*Utils.js` or pure utility files
- `ui/` components should NOT import `*Queries.js`, `supabase-client.js`, or data fetching modules
- All data fetching happens in `app/` (pages, API routes, or Server Actions)
- Data flows down to `ui/` components as props

## Completed Refactorings ✅

### Phase 1: Simple Static Queries
- ✅ **ProfileHeader.jsx** - Moved `getProfileCount()` to server-side
  - Fetched in `app/page.jsx` and `app/[slug]/page.jsx`
  - Passed as prop through component tree
  - Removed client-side useEffect and state

- ✅ **ProfileCard.jsx** - Moved `getDuplicateNameCount()` to server-side
  - Fetched in `app/[slug]/page.jsx`
  - Passed as prop through ProfilePageClient
  - Removed client-side useEffect and state

**Benefits achieved:**
- Data included in initial HTML (no flash/layout shift)
- Cleaner components (removed async logic and side effects)
- Fewer client-side network requests
- Net -8 lines of code removed

## Current Violations

### Files in `ui/` importing data-fetching modules:

```
ui/signup/AddUserForm.jsx
  ├─ checkAddressTaken, createProfile, insertProfileLinks (@/lib/signup/createProfile)
  ├─ checkUsernameExists (@/lib/directory/searchProfiles)
  └─ checkUsernameIsVerified (@/lib/profile/profileQueries)

ui/social/useVerificationFlow.js
  ├─ getSession, onAuthStateChange (@/lib/supabase/auth)
  └─ updateLinkVerification (@/lib/social/verifyLinkDb)

ui/ns-directory/useNsProfiles.js
  └─ supabase (@/lib/supabase/supabase-client)

ui/profile/useProfileLinks.js
  └─ supabase (@/lib/supabase/supabase-client)

ui/signup/CitySearchDropdown.jsx
  └─ searchCities (@/lib/directory/searchCities)

ui/profile/ProfileSearchDropdown.jsx
  └─ searchProfiles, checkUsernameExists (@/lib/directory/searchProfiles)

ui/verification/InlineOtpForm.jsx
  └─ confirmOtp (@/lib/verification/confirmOtp)

ui/verification/SubmitOtp.jsx
  └─ confirmOtp (@/lib/verification/confirmOtp)
```

## Refactoring Categories

### 1. Interactive Search Components (Use Server Actions)
**Pattern:** Create Server Actions for client-side interactive queries

**Files:**
- `ui/profile/ProfileSearchDropdown.jsx`
  - Query: `searchProfiles(query, limit)`, `checkUsernameExists(query)`
  - Solution: Create Server Actions (NOT public API routes)
  - User types → calls Server Action → executes on server → returns results

- `ui/signup/CitySearchDropdown.jsx`
  - Query: `searchCities(query)`
  - Solution: Create Server Action for city search

### 2. Form Mutations (Use Server Actions)
**Pattern:** Create Server Actions for mutations, Server Actions for validation

**Files:**
- `ui/signup/AddUserForm.jsx`
  - Mutations: `createProfile()`, `insertProfileLinks()`
  - Validation: `checkUsernameExists()`, `checkAddressTaken()`, `checkUsernameIsVerified()`
  - Solution:
    - Server Action for form submission
    - Server Actions for real-time validation (NOT public APIs)

### 3. Real-time Subscriptions (Keep in ui/ or move to API)
**Pattern:** Subscriptions are inherently client-side, but should be encapsulated

**Files:**
- `ui/ns-directory/useNsProfiles.js`
  - Uses: `supabase.from('profiles').select().subscribe()`
  - Decision: TBD - Keep in ui/ OR create abstraction layer

- `ui/profile/useProfileLinks.js`
  - Uses: `supabase.from('profile_links').select().subscribe()`
  - Decision: TBD - Keep in ui/ OR create abstraction layer

### 4. Auth/Verification (Keep in ui/)
**Pattern:** Auth is inherently client-side, acceptable to keep

**Files:**
- `ui/social/useVerificationFlow.js` - OAuth flows, auth state
- `ui/verification/InlineOtpForm.jsx` - OTP submission
- `ui/verification/SubmitOtp.jsx` - OTP submission
- Decision: These can stay in ui/ - auth is client-side by nature

## Implementation Phases

### Phase 2: Server Actions for search/autocomplete
**Goal:** Move real-time search queries to Server Actions (NOT public APIs)

- [ ] Create `lib/actions/searchProfilesAction.js`
  - Server Action wrapping `searchProfiles()` and `checkUsernameExists()`
  - Returns JSON with results and availability
  - NOT publicly accessible

- [ ] Create `lib/actions/searchCitiesAction.js`
  - Server Action wrapping `searchCities()`

- [ ] Update components to use Server Actions:
  - `ProfileSearchDropdown.jsx`
  - `CitySearchDropdown.jsx`

### Phase 3: Server Actions for forms
**Goal:** Move form mutations to Server Actions

- [ ] Create `lib/actions/createProfileAction.js`
  - Server Action wrapping `createProfile()` and `insertProfileLinks()`

- [ ] Create validation Server Actions:
  - `lib/actions/checkUsernameAction.js`
  - `lib/actions/checkAddressAction.js`

- [ ] Refactor `AddUserForm.jsx`:
  - Use Server Action for submission
  - Use Server Actions for real-time validation

### Phase 4: Decision on subscriptions
**Goal:** Decide pattern for real-time data

**Options:**
1. Keep in `ui/` but create wrapper hooks that don't expose supabase client
2. Move to API routes with Server-Sent Events (SSE)
3. Use React Server Components with streaming

**Files to evaluate:**
- `ui/ns-directory/useNsProfiles.js`
- `ui/profile/useProfileLinks.js`

### Phase 5: Validation & Cleanup
**Goal:** Ensure no violations remain

- [ ] Run script to check for violations:
  ```bash
  grep -r "from.*@/lib/" ui/ --include="*.jsx" | grep -v "Utils"
  ```
- [ ] Document conventions in README or ARCHITECTURE.md
- [ ] Consider adding ESLint rule to enforce pattern

## Success Criteria

- [x] `ui/profile/ProfileHeader.jsx` no longer imports `getProfileCount`
- [x] `ui/profile/ProfileCard.jsx` no longer imports `getDuplicateNameCount`
- [ ] No `ui/` components import from `lib/directory/searchProfiles.js`
- [ ] No `ui/` components import from `lib/signup/createProfile.js`
- [ ] No `ui/` components import `supabase` directly (except approved hooks)
- [ ] All data fetching happens in `app/`, or Server Actions (NOT public APIs)
- [ ] UI components receive data via props or Server Actions
- [ ] Existing functionality unchanged (no user-facing regressions)

## Notes

- ✅ Simple static queries moved to server-side rendering (Phase 1 complete)
- Auth/verification flows are exceptions (client-side by nature)
- Real-time subscriptions need architectural decision before refactoring
- **Use Server Actions instead of API routes to avoid creating public APIs**
- Server Actions are NOT publicly accessible (only callable from your app)
