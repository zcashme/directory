# Feature-Based Architecture Implementation Plan

## Executive Summary

**Goal:** Eliminate cross-folder imports between `lib/` and `ui/` while maintaining the three-folder structure: `app/`, `lib/`, `ui/`

**Approach:** Reorganize code within existing folders to eliminate ui/ → lib/ hook/provider imports
**Scope:** All code EXCEPT `app/ns/` directory (NS can stay messy - no refactoring needed)
**Key Strategy:** Move hooks and providers into ui/, keep pure business logic in lib/
**Estimated Complexity:** Medium-High (15 UI files with lib/ imports, 7 hooks to move, 3 providers to move)

---

## Current State Analysis

### Cross-Folder Import Statistics
- **15 UI files** import from lib/
- **1 lib file** imports from ui/ (assets only)
- **7 hooks** scattered across lib/
- **20+ business logic functions** in lib/
- **3 context providers** in lib/

### Import Patterns Identified

```
ui/ (presentation) → lib/ (business logic + hooks) ❌
  ├── 7 hooks (use*)
  ├── 20+ business logic functions
  ├── 15+ utilities
  └── 3 context providers

lib/social/profileLinks.js → ui/assets/ (favicons) ❌
```

### Key Problem Areas

1. **ProfileEditor.jsx** - Imports from 7 different lib/ subdirectories
2. **ProfileCard.jsx** - Imports from 6 lib/ subdirectories
3. **Verification components** - Tightly coupled to lib/verification/ and lib/messaging/
4. **Signup components** - Tightly coupled to lib/signup/, lib/social/, lib/directory/

---

## Target Structure (Three Folders Only)

**Principle:** Eliminate cross-imports by moving hooks/providers to `ui/`, keeping only pure utilities in `lib/`

### Current Problem
- ❌ 15 `ui/` components import hooks/providers from `lib/`
- ❌ `lib/social/profileLinks.js` imports assets from `ui/`

### Solution
- ✅ Move all hooks from `lib/` → `ui/` (colocate with components)
- ✅ Move providers from `lib/` → `ui/`
- ✅ Move assets from `ui/` → `lib/social/` (only used there)
- ✅ Keep pure utilities in `lib/` (no React, no hooks)
- ✅ `ui/` components CAN import from `lib/` utilities (acceptable pattern)

### After Refactoring

```
app/                           # Next.js routes (no changes needed)
├── [slug]/                    # Profile pages (uses ui/profile/)
├── ns/                        # ⚠️ EXCEPTION: Can stay messy, no refactor needed
├── admin/refunds/
├── api/
├── privacy/
├── terms/
├── page.jsx                   # Home page (uses ui/profile/)
├── HomePage.jsx
├── layout.jsx
└── providers.jsx

lib/                           # PURE business logic (no hooks, no React, no providers)
├── profile/
│   ├── profiles.js           # Data fetching
│   ├── profile.js            # Profile data operations
│   ├── profileUtils.js       # Calculations (trust, rank, warnings)
│   └── normalizeSlugs.js     # Slug generation
│
├── social/
│   ├── profileLinks.js       # Link enrichment (uses assets/ below)
│   ├── social-lookup.js      # Platform lookups
│   ├── usernameNormalizer.js # Username normalization
│   ├── verifyLinkDb.js       # Link verification DB
│   ├── accountAuthFlow.js    # OAuth flow logic
│   ├── providerAvatars.js    # Avatar handling
│   └── assets/               # ← Social favicons (moved from ui/assets/)
│       └── favicons/
│
├── directory/
│   ├── searchCities.js       # City search
│   ├── searchProfiles.js     # Profile search
│   └── fetchFeaturedProfiles.js
│
├── zcash/
│   └── zcashUtils.js         # Address validation, URI building
│
├── verification/
│   └── confirmOtp.js         # OTP confirmation logic
│
├── signup/
│   └── createProfile.js      # Profile creation logic
│
├── supabase/                  # Database client (keep as-is)
├── cache/                     # Cache utilities (keep as-is)
├── validateUrl.js            # URL validation utility
└── textareaCaret.js          # Caret positioning utility

ui/                            # UI components + hooks + providers
├── profile/
│   ├── ProfileCard.jsx
│   ├── ProfileEditor.jsx
│   ├── ProfilePageClient.jsx
│   ├── ProfileHeader.jsx
│   ├── ProfileAvatar.jsx
│   ├── ProfileSearchDropdown.jsx
│   ├── ProfileField.jsx
│   ├── VerifiedBadge.jsx
│   ├── CopyButton.jsx
│   ├── VerifiedCardWrapper.jsx
│   ├── AuthExplainerModal.jsx
│   ├── editorModals.jsx
│   ├── useProfileLinks.js    # ← Moved from lib/profile/
│   ├── useProfileEvents.js   # ← Moved from lib/profile/
│   ├── edits-provider.jsx    # ← Moved from lib/profile/
│   └── selection-provider.jsx # ← Moved from lib/profile/
│
├── verification/
│   ├── ProfileVerification.jsx
│   ├── InlineOtpForm.jsx
│   ├── SubmitOtp.jsx
│   ├── QrUriBlock.jsx
│   ├── AmountAndWallet.jsx
│   ├── HelpMessage.jsx
│   └── useVerificationPolling.js  # ← Moved from lib/verification/
│
├── messaging/
│   ├── MemoComposer.jsx
│   ├── useFeedback.js        # ← Moved from lib/messaging/
│   ├── messaging-provider.jsx # ← Moved from lib/messaging/
│   └── useEmojiAutocomplete.js  # ← Moved from lib/
│
├── signup/
│   ├── AddUserForm.jsx
│   ├── ZcashAddressInput.jsx
│   ├── CitySearchDropdown.jsx
│   ├── SocialLinkInput.jsx
│   └── LinkInput.jsx
│
├── directory/
│   ├── AlphabetSidebar.jsx
│   ├── LetterGridModal.jsx
│   ├── ReferRankBadgeMulti.jsx
│   └── useProfiles.js        # ← Moved from lib/directory/
│
├── social/
│   └── useVerificationFlow.js # ← Moved from lib/social/
│
└── common/
    ├── HelpIcon.jsx
    ├── ModalPortal.jsx
    └── useLazyVisible.js     # ← Moved from lib/
```

### Import Rules After Refactoring

✅ **Allowed:**
- `app/` → `ui/` (routes use UI components)
- `app/` → `lib/` (routes use utilities)
- `ui/` → `lib/` (components use utilities - **ACCEPTABLE PATTERN**)
- `lib/` → `lib/` (utilities use other utilities)

❌ **Not Allowed:**
- `lib/` → `ui/` (business logic must not import UI/React code)
- `ui/` → `lib/` hooks (no more hooks in lib/)
- `ui/` → `lib/` providers (no more providers in lib/)

⚠️ **Exception:**
- `app/ns/` can import from anywhere (messy is OK, no cleanup needed)

### Design Decisions

✅ **Keep three folders:** `app/`, `lib/`, `ui/` (no new folders)
✅ **Exception:** `app/ns/` excluded from refactoring (can stay messy)
✅ **lib/ contains:** Pure business logic, data fetching, utilities (no React dependencies)
✅ **ui/ contains:** Components, hooks, providers (can import from lib/)
🎯 **Eliminate:** ui/ importing hooks/providers from lib/
🎯 **Move:** All hooks from lib/ → ui/
🎯 **Move:** All providers from lib/ → ui/
🎯 **Move:** Assets from ui/ → lib/ (only lib/social/profileLinks.js needs them)

---

## Files to Move

### Hooks (7 files)
1. `lib/profile/useProfileLinks.js` → `ui/profile/useProfileLinks.js`
2. `lib/profile/useProfileEvents.js` → `ui/profile/useProfileEvents.js`
3. `lib/verification/useVerificationPolling.js` → `ui/verification/useVerificationPolling.js`
4. `lib/social/useVerificationFlow.js` → `ui/social/useVerificationFlow.js`
5. `lib/directory/useProfiles.js` → `ui/directory/useProfiles.js`
6. `lib/messaging/useFeedback.js` → `ui/messaging/useFeedback.js`
7. `lib/useEmojiAutocomplete.js` → `ui/messaging/useEmojiAutocomplete.js`

### Providers (3 files)
8. `lib/profile/edits-provider.jsx` → `ui/profile/edits-provider.jsx`
9. `lib/profile/selection-provider.jsx` → `ui/profile/selection-provider.jsx`
10. `lib/messaging/messaging-provider.jsx` → `ui/messaging/messaging-provider.jsx`

### Other Files
11. `lib/useLazyVisible.js` → `ui/common/useLazyVisible.js`

### Assets
12. `ui/assets/favicons/*` → `lib/social/assets/favicons/*`

### lib/ files to keep (pure utilities)
✅ Keep all other files in lib/ (they're pure business logic)

---

## Migration Strategy

### Phase 1: Move Common Hooks (Low Risk)
**Files:** 2 files
- Move `lib/useEmojiAutocomplete.js` → `ui/messaging/useEmojiAutocomplete.js`
- Move `lib/useLazyVisible.js` → `ui/common/useLazyVisible.js`

**Update imports in:**
- `ui/messaging/MemoComposer.jsx`
- Any files using useLazyVisible

**Risk:** Low - Simple hooks with minimal dependencies
**Commit:** `refactor: move common hooks to ui/`

---

### Phase 2: Move Assets (No Code Changes)
**Files:** Multiple favicon files
- Move `ui/assets/favicons/*` → `lib/social/assets/favicons/*`

**Update imports in:**
- `lib/social/profileLinks.js` (only file that uses these)

**Risk:** Low - Just asset relocation
**Commit:** `refactor: move social favicons to lib/social/assets`

---

### Phase 3: Move Profile Providers (Medium Risk)
**Files:** 2 providers
- Move `lib/profile/edits-provider.jsx` → `ui/profile/edits-provider.jsx`
- Move `lib/profile/selection-provider.jsx` → `ui/profile/selection-provider.jsx`

**Update imports in:**
- `app/providers.jsx` (if it imports these)
- `lib/messaging/useFeedback.js` (uses these contexts)
- Any profile components

**Risk:** Medium - Core state management
**Commit:** `refactor: move profile providers to ui/profile`

---

### Phase 4: Move Profile Hooks (Medium Risk)
**Files:** 2 hooks
- Move `lib/profile/useProfileLinks.js` → `ui/profile/useProfileLinks.js`
- Move `lib/profile/useProfileEvents.js` → `ui/profile/useProfileEvents.js`

**Update imports in:**
- `ui/profile/ProfileCard.jsx`
- Any other profile components

**Risk:** Medium - Used by core profile features
**Commit:** `refactor: move profile hooks to ui/profile`

---

### Phase 5: Move Directory Hook (Low Risk)
**Files:** 1 hook
- Move `lib/directory/useProfiles.js` → `ui/directory/useProfiles.js`

**Update imports in:**
- `ui/profile/ProfileHeader.jsx`
- `ui/signup/AddUserForm.jsx`

**Risk:** Low - Straightforward hook
**Commit:** `refactor: move directory hooks to ui/directory`

---

### Phase 6: Move Social Hook (Low Risk)
**Files:** 1 hook
- Move `lib/social/useVerificationFlow.js` → `ui/social/useVerificationFlow.js`

**Update imports in:**
- `ui/profile/ProfileEditor.jsx`

**Risk:** Low - OAuth verification hook
**Commit:** `refactor: move social hooks to ui/social`

---

### Phase 7: Move Verification Hook (Medium Risk)
**Files:** 1 hook
- Move `lib/verification/useVerificationPolling.js` → `ui/verification/useVerificationPolling.js`

**Update imports in:**
- `ui/verification/ProfileVerification.jsx`

**Risk:** Medium - Core verification flow
**Commit:** `refactor: move verification hooks to ui/verification`

---

### Phase 8: Move Messaging Provider & Hook (High Risk)
**Files:** 2 files
- Move `lib/messaging/messaging-provider.jsx` → `ui/messaging/messaging-provider.jsx`
- Move `lib/messaging/useFeedback.js` → `ui/messaging/useFeedback.js`

**Update imports in:**
- `app/providers.jsx`
- `ui/verification/ProfileVerification.jsx`
- `ui/verification/SubmitOtp.jsx`
- `ui/profile/ProfileCard.jsx`
- `ui/profile/ProfileEditor.jsx`
- `ui/profile/ProfilePageClient.jsx`
- `ui/messaging/MemoComposer.jsx`

**Dependencies:**
- useFeedback depends on EditsContext, SelectionContext, MessagingContext
- All three providers must be in ui/ before moving useFeedback

**Risk:** High - Complex state aggregation, many dependents
**Commit:** `refactor: move messaging to ui/messaging`

---

### Phase 9: Cleanup Empty Directories
**Action:** Remove empty directories in lib/ after moves

```bash
# Remove empty hook/provider directories
rmdir lib/messaging  # If empty after moving useFeedback and provider
# Check if any lib/ subdirectories are now empty
```

**Commit:** `refactor: cleanup empty lib directories`

---

### Phase 10: Create ui/ Subdirectory for Social Hook
**Action:** Create `ui/social/` directory if it doesn't exist

```bash
mkdir -p ui/social
```

---

## Migration Checklist

### Pre-Migration
- [ ] Review current cross-folder imports
- [ ] Run tests to establish baseline
- [ ] Create feature branch: `git checkout -b refactor/eliminate-cross-folder-imports`
- [ ] Document import patterns

### Phase 1: Common Hooks
- [ ] Move useEmojiAutocomplete to ui/messaging
- [ ] Move useLazyVisible to ui/common
- [ ] Update imports
- [ ] Test affected components
- [ ] Commit

### Phase 2: Assets
- [ ] Create lib/social/assets/favicons directory
- [ ] Move favicon files
- [ ] Update lib/social/profileLinks.js imports
- [ ] Test profile links rendering
- [ ] Commit

### Phase 3: Profile Providers
- [ ] Move edits-provider.jsx to ui/profile
- [ ] Move selection-provider.jsx to ui/profile
- [ ] Update imports in app/providers.jsx
- [ ] Update imports in useFeedback (if needed)
- [ ] Test profile editing flow
- [ ] Commit

### Phase 4: Profile Hooks
- [ ] Move useProfileLinks to ui/profile
- [ ] Move useProfileEvents to ui/profile
- [ ] Update imports in ProfileCard
- [ ] Test profile functionality
- [ ] Commit

### Phase 5: Directory Hook
- [ ] Move useProfiles to ui/directory
- [ ] Update imports
- [ ] Test directory/profile search
- [ ] Commit

### Phase 6: Social Hook
- [ ] Create ui/social directory
- [ ] Move useVerificationFlow to ui/social
- [ ] Update imports in ProfileEditor
- [ ] Test social verification flow
- [ ] Commit

### Phase 7: Verification Hook
- [ ] Move useVerificationPolling to ui/verification
- [ ] Update imports
- [ ] Test OTP verification
- [ ] Commit

### Phase 8: Messaging
- [ ] Move messaging-provider.jsx to ui/messaging
- [ ] Move useFeedback to ui/messaging
- [ ] Update all imports (7+ files)
- [ ] Test messaging/feedback system
- [ ] Commit

### Phase 9: Cleanup
- [ ] Remove empty lib/ subdirectories
- [ ] Verify no broken imports
- [ ] Run full test suite
- [ ] Commit

### Post-Migration
- [ ] Verify all tests pass
- [ ] Manual QA of key features
- [ ] Update documentation
- [ ] Create PR for review

---

## Testing Strategy

### After Each Phase
1. **Import Verification:** Ensure no broken imports
2. **Unit Tests:** Run tests for affected modules
3. **Manual Testing:** Test UI functionality
4. **Console Check:** No errors in browser console

### Final Validation
1. Run full test suite
2. Manual QA:
   - Profile editing
   - Social verification
   - OTP verification
   - Messaging/feedback
   - Directory search
   - Signup flow
3. Check for any remaining cross-imports:
   ```bash
   # Check ui/ → lib/ hook imports (should be 0)
   grep -r "from.*lib.*use" ui/ --exclude-dir=node_modules

   # Check lib/ → ui/ imports (should be 0)
   grep -r "from.*ui/" lib/ --exclude-dir=node_modules
   ```

---

## Risk Mitigation

### High-Risk Areas
1. **useFeedback** - Aggregates 3 contexts, many dependents (test thoroughly)
2. **Profile providers** - Core state management (test editing flow)
3. **Verification hooks** - Critical security flow (test OTP)

### Rollback Strategy
- Each phase is a separate commit
- Can revert individual phases if issues arise
- Keep original structure until all tests pass

### Dependency Notes
- **useFeedback depends on:** EditsContext, SelectionContext, MessagingContext
- Move all providers before moving useFeedback
- Update imports in 7+ files when moving useFeedback

---

## Success Metrics

### Before Migration
- ❌ 15 UI files importing hooks/providers from lib/
- ❌ 1 lib file importing assets from ui/
- ❌ 7 hooks in lib/
- ❌ 3 providers in lib/

### After Migration
- ✅ 0 UI files importing hooks from lib/
- ✅ 0 lib files importing from ui/
- ✅ All hooks in ui/ (colocated with components)
- ✅ All providers in ui/
- ✅ lib/ contains only pure utilities (no React)
- ✅ Clean import boundaries maintained

---

## Next Steps

1. **Review this plan** - Ensure approach is sound
2. **Create feature branch** - `git checkout -b refactor/eliminate-cross-folder-imports`
3. **Start with Phase 1** - Low-risk common hooks
4. **Progress through phases** - Test after each phase
5. **Final validation** - Full test suite + manual QA
6. **Create PR** - Request review before merging

---

## Notes

### Key Principles
- **lib/ = pure utilities** (no React, no hooks, no providers)
- **ui/ = components + hooks + providers** (can import from lib/)
- **app/ns/ = exception** (no refactoring needed, can stay messy)

### Acceptable Patterns After Migration
- ✅ `ui/profile/ProfileCard.jsx` importing `lib/profile/profileUtils.js` (utility)
- ✅ `ui/verification/InlineOtpForm.jsx` importing `lib/verification/confirmOtp.js` (business logic)
- ✅ `ui/signup/AddUserForm.jsx` importing `lib/zcash/zcashUtils.js` (utility)

### Unacceptable Patterns (To Eliminate)
- ❌ `ui/profile/ProfileCard.jsx` importing `lib/profile/useProfileLinks.js` (hook)
- ❌ `ui/messaging/MemoComposer.jsx` importing `lib/messaging/messaging-provider.jsx` (provider)
- ❌ `lib/social/profileLinks.js` importing `ui/assets/favicons/` (assets)

---

**Last Updated:** 2026-02-04
**Author:** Claude Code
**Status:** Ready for Implementation
**Scope:** Excludes app/ns/ (can stay messy)
