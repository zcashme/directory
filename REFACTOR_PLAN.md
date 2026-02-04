# Profile Architecture Refactor - Multi-Phase Plan

## Current Problems

1. **ProfileHeader** loads ALL 1500+ profiles just to show count and find one profile
2. **AddUserForm** uses `cachedProfiles` for validation (unreliable, slow)
3. **ProfileCard** uses `window.cachedProfiles` to count duplicate names (O(n) operation)
4. **MemoComposer** uses `window.cachedProfiles` for search
5. **Global state pollution** via `window.cachedProfiles`
6. **Client-side filtering** instead of database queries
7. **useProfiles hook** is over-used and does too much

## Goal

Remove the need to fetch all profiles anywhere except the NS Directory page.

---

## Phase 1: Add Database Helpers (No Breaking Changes)

**Goal:** Create proper database query functions without breaking existing code.

### Changes:

1. **Create `lib/profile/profileQueries.js`:**
   ```javascript
   // Get total profile count
   export async function getProfileCount()

   // Find profile by address
   export async function findProfileByAddress(address)

   // Check if username exists
   export async function checkUsernameExists(username)

   // Check if address exists
   export async function checkAddressExists(address)

   // Get duplicate name count for a specific name
   export async function getDuplicateNameCount(name)
   ```

2. **Add database field to `zcasher_searchable` view:**
   ```sql
   ALTER TABLE zcasher ADD COLUMN duplicate_name_count INTEGER DEFAULT 0;

   -- Create trigger to maintain duplicate_name_count
   CREATE OR REPLACE FUNCTION update_duplicate_name_count()
   -- (Update count when names are added/changed/deleted)
   ```

### Validation:
- ✅ New functions work correctly
- ✅ Database field populates correctly
- ✅ Existing code still works (no changes to existing components yet)

### Estimated Time: 2-4 hours

---

## Phase 2: Fix ProfileHeader (Biggest Win)

**Goal:** Remove the massive profile fetch from ProfileHeader.

### Current Issues:
- Fetches ALL 1500+ profiles on every page
- Only uses data for: count, finding one profile, passing unused data to dropdown

### Changes:

1. **Remove `useProfiles` from ProfileHeader:**
   ```javascript
   // BEFORE:
   const { profiles } = useProfiles(null, true); // Fetches 1500+ profiles

   // AFTER:
   const [profileCount, setProfileCount] = useState(0);
   const [selectedProfile, setSelectedProfile] = useState(null);

   useEffect(() => {
     getProfileCount().then(setProfileCount);
   }, []);

   useEffect(() => {
     if (selectedAddress) {
       findProfileByAddress(selectedAddress).then(setSelectedProfile);
     }
   }, [selectedAddress]);
   ```

2. **Remove `profiles` prop from ProfileSearchDropdown:**
   - It already uses `searchProfiles()` API
   - The prop is completely unused

### Validation:
- ✅ Search still works
- ✅ Profile count displays correctly
- ✅ Selected profile displays correctly
- ✅ Page loads instantly (no 1500+ profile fetch)

### Impact:
- **Massive performance improvement** - removes biggest bottleneck
- **Reduces initial load by ~500KB-1MB**

### Estimated Time: 1-2 hours

---

## Phase 3: Fix AddUserForm Validation

**Goal:** Use database queries instead of client-side filtering.

### Current Issues:
- Relies on `cachedProfiles` which may be null
- Loops through all profiles client-side
- Race conditions if cache isn't loaded yet

### Changes:

1. **Replace client-side validation with database queries:**
   ```javascript
   // BEFORE:
   const matchingProfile = profiles.find(p => normForConflict(p.name) === key);

   // AFTER:
   const exists = await checkUsernameExists(name);
   const isVerified = await checkUsernameIsVerified(name);
   ```

2. **Remove dependency on `cachedProfiles`:**
   - Remove import: `import { cachedProfiles } from "@/ui/directory/useProfiles"`
   - Use database queries for all validation

3. **Add real-time validation:**
   - Debounced username check as user types
   - Debounced address check as user types
   - Show availability instantly

### Validation:
- ✅ Username validation works correctly
- ✅ Address validation works correctly
- ✅ Verified vs unverified name detection works
- ✅ No dependency on cached data
- ✅ Works even if user navigates directly to form

### Estimated Time: 2-3 hours

---

## Phase 4: Fix ProfileCard Duplicate Detection

**Goal:** Use database field instead of client-side computation.

### Current Issues:
- Accesses `window.cachedProfiles` (global pollution)
- Loops through ALL profiles to count duplicates (O(n))
- Unreliable if cache not loaded

### Changes:

1. **Use database field from Phase 1:**
   ```javascript
   // BEFORE:
   const cachedProfiles = window.cachedProfiles;
   const { hasDuplicateNames } = checkDuplicateNames(profile, cachedProfiles);

   // AFTER:
   const hasDuplicateNames = (profile.duplicate_name_count ?? 0) > 1;
   ```

2. **Update `checkDuplicateNames` in `profileUtils.js`:**
   - Make it only check `duplicate_name_count` field
   - Remove client-side counting logic
   - Remove `cachedProfiles` parameter

### Validation:
- ✅ Duplicate name warnings show correctly
- ✅ No dependency on window.cachedProfiles
- ✅ Works on all pages, even direct navigation

### Estimated Time: 1 hour

---

## Phase 5: Fix MemoComposer Search

**Goal:** Use searchProfiles API instead of window.cachedProfiles.

### Current Issues:
- Uses `window.cachedProfiles` for recipient search
- Unreliable if not loaded

### Changes:

1. **Replace ProfileSearchDropdown with direct search:**
   ```javascript
   // BEFORE:
   profiles={window.cachedProfiles || []}

   // AFTER:
   // ProfileSearchDropdown already has built-in search via searchProfiles()
   // Just remove the profiles prop
   ```

### Validation:
- ✅ Recipient search works
- ✅ No dependency on global state

### Estimated Time: 30 minutes

---

## Phase 6: Clean Up useProfiles Hook

**Goal:** Simplify useProfiles to only serve NS Directory page.

### Current State:
- Used in 3 places: NS Directory, ProfileHeader, indirectly via cachedProfiles
- After Phase 2-5: Only used in NS Directory

### Changes:

1. **Rename and simplify:**
   ```javascript
   // Rename: useProfiles → useNsProfiles
   // Remove: revalidate parameter (always false)
   // Remove: cachedProfiles export
   // Remove: window.cachedProfiles pollution
   // Remove: addProfile function (unused)
   ```

2. **Update NS Directory to use renamed hook:**
   ```javascript
   // app/ns/useNsDirectory.js
   import useNsProfiles from "@/ui/directory/useNsProfiles";
   ```

3. **Delete old useProfiles:**
   - Remove `ui/directory/useProfiles.js`
   - Verify no imports remain

### Validation:
- ✅ NS Directory still works
- ✅ No other code depends on useProfiles
- ✅ No window.cachedProfiles anywhere
- ✅ Codebase is cleaner

### Estimated Time: 1-2 hours

---

## Phase 7: Optimize NS Directory (Optional)

**Goal:** Add pagination if profile count grows significantly.

### Current State:
- Fetches all NS profiles (currently manageable)
- Server-side fetch, so acceptable performance

### Future Optimization (if needed):
- Add cursor-based pagination
- Virtual scrolling for table
- Only if profile count exceeds 500-1000

### Estimated Time: 3-4 hours (only if needed)

---

## Total Estimated Time: 8-13 hours

## Risk Assessment

| Phase | Risk Level | Reason |
|-------|-----------|--------|
| Phase 1 | 🟢 Low | Only adds new code, no breaking changes |
| Phase 2 | 🟡 Medium | Changes ProfileHeader, but isolated component |
| Phase 3 | 🟡 Medium | Changes form validation logic |
| Phase 4 | 🟢 Low | Simple field read instead of computation |
| Phase 5 | 🟢 Low | Minor prop removal |
| Phase 6 | 🟢 Low | Cleanup, all dependencies removed in earlier phases |
| Phase 7 | 🟢 Low | Optional optimization |

## Success Metrics

### Performance:
- ✅ ProfileHeader loads in <100ms (vs current ~2-3s)
- ✅ Search works in <200ms
- ✅ Form validation in <300ms
- ✅ Zero "fetch all profiles" calls outside NS Directory

### Code Quality:
- ✅ No global state pollution (`window.cachedProfiles`)
- ✅ No client-side filtering of 1500+ records
- ✅ Proper database queries for all lookups
- ✅ Components work independently (no cache dependencies)

### User Experience:
- ✅ Instant page loads
- ✅ Real-time validation feedback
- ✅ Reliable behavior (no race conditions)

---

## Implementation Order

**Week 1:**
- Day 1-2: Phase 1 (Database helpers + fields)
- Day 3: Phase 2 (ProfileHeader - biggest win)
- Day 4: Phase 3 (AddUserForm)

**Week 2:**
- Day 5: Phase 4 (ProfileCard)
- Day 5: Phase 5 (MemoComposer)
- Day 6: Phase 6 (Cleanup)
- Day 7: Testing & validation

**Future (if needed):**
- Phase 7: NS Directory pagination

---

## Rollback Plan

Each phase is independent and can be rolled back:

1. **Phase 1:** Delete new files, no impact
2. **Phase 2:** Revert ProfileHeader.jsx
3. **Phase 3:** Revert AddUserForm.jsx
4. **Phase 4:** Revert ProfileCard.jsx and profileUtils.js
5. **Phase 5:** Revert MemoComposer.jsx
6. **Phase 6:** Restore useProfiles.js

---

## Post-Refactor Architecture

```
┌─────────────────────────────────────────────┐
│           Database (Supabase)               │
│  - zcasher table                           │
│  - zcasher_searchable view                 │
│  - duplicate_name_count field (computed)   │
└─────────────────────────────────────────────┘
                    ▲
                    │ Direct queries
                    │
    ┌───────────────┴──────────────────┐
    │                                   │
┌───▼─────────────┐         ┌──────────▼────────┐
│ Profile Queries │         │  Search API       │
│ (helpers)       │         │  searchProfiles() │
└───┬─────────────┘         └──────────┬────────┘
    │                                   │
    │ Used by:                          │ Used by:
    │ - ProfileHeader (count, find)     │ - ProfileSearchDropdown
    │ - AddUserForm (validation)        │ - MemoComposer
    │ - ProfileCard (duplicate field)   │ - ProfileHeader search
    │                                   │
    └───────────────┬───────────────────┘
                    │
         ┌──────────▼──────────┐
         │  useNsProfiles      │
         │  (NS Directory only)│
         └─────────────────────┘
```

**Key Improvements:**
- ✅ Direct database queries for specific needs
- ✅ Search API for autocomplete
- ✅ Single-purpose hook for NS Directory
- ✅ No global state
- ✅ No massive data fetches
