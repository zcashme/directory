# HANDOFF: Unifying Form State and Pending Edits

## Problem Statement

**Original Issue:**
```
Cannot update a component (ProfilePage) while rendering a different component (ProfileEditor).
To locate the bad setState() call inside ProfileEditor, follow the stack trace
```

The error occurred at `ui/profile/ProfileEditor.tsx:447` in the `removeLink` function:
```typescript
const removeLink = (uid: string) =>
  setForm((prev) => {
    const removed = prev.links.find((l) => l._uid === uid);
    const newLinks = prev.links.filter((l) => l._uid !== uid);
    if (removed?.id && setPendingEdits) appendLinkToken(setPendingEdits, `-${removed.id}`); // ❌ ERROR HERE
    return { ...prev, links: newLinks };
  });
```

**Root Cause:**
- `setForm` is local component state (`useState`)
- `setPendingEdits` is global Zustand store
- Calling `setPendingEdits` **inside** `setForm`'s updater function triggers React's "setState during render" error
- These two pieces of state needed to be manually kept in sync throughout the component

## Architecture Decision: Option 3 - Unified State

**Agreed approach:** Merge everything into the edits store (Option 3)

**Why this approach:**
1. Single source of truth - no manual syncing needed
2. Store already exists (`useEditsStore`)
3. `ProfileVerification` already reads from it
4. Simpler mental model: "the store IS the form"
5. `pendingEdits` is auto-computed from `form` vs `original`

## What Has Been Done ✅

### 1. Updated `lib/stores/edits.ts`

**New store structure:**
```typescript
interface EditsState {
  // Form state
  form: FormState;              // Current values in the form
  original: OriginalState;      // Original values from profile
  deletedFields: DeletedFields; // Deleted field checkboxes
  linkAuthTokens: string[];     // Auth tokens like "!123" or "+!https://x.com/handle"
  pendingEdits: PendingEdits;   // AUTO-COMPUTED from above

  // Actions
  setForm: (form: FormState | ((prev: FormState) => FormState)) => void;
  updateField: (field: keyof FormState, value: any) => void;
  setDeletedField: (field: keyof DeletedFields, value: boolean) => void;
  initializeForm: (profile: Profile, links: ParsedLink[]) => void;
  addLinkAuthToken: (token: string) => void;
  removeLinkAuthToken: (token: string) => void;
}
```

**Key changes:**
- Moved `FormState`, `ParsedLink` types into the store
- Added `computePendingEdits()` helper function (lines 88-145)
- Every state mutation now recomputes `pendingEdits` automatically
- No more manual `setPendingEdits` needed for basic field changes

### 2. Updated `ui/profile/ProfileEditor.tsx`

**Replaced:**
```typescript
const [form, setForm] = useState<FormState>({...});
const [deletedFields, setDeletedFields] = useState({...});
const { setPendingEdits, pendingEdits } = useEditsStore();
```

**With:**
```typescript
const {
  form,
  deletedFields,
  pendingEdits,
  setForm,
  updateField,
  setDeletedField,
  initializeForm,
  addLinkAuthToken,
  removeLinkAuthToken,
} = useEditsStore();
```

**Changes made:**
- Line 110-120: Import from store instead of local state
- Line 160-168: Initialize form using `initializeForm()` instead of `useState`
- Line 48: Deleted `createDeleteToggle` helper function
- Lines 467, 550, 582, 601, 661: Replace `createDeleteToggle` with direct `setDeletedField` calls
- Line 382-383: `handleChange` now calls `updateField` instead of `setForm`
- Line 385: `avatarCallbacks` now uses `setDeletedField` instead of `setDeletedFields`
- Line 420-425: `removeLink` simplified - deletion token auto-computed
- Line 436-446: `resetLinks` simplified - tokens auto-recomputed

### 3. Updated `app/[slug]/ProfilePage.tsx`

- Line 44: Still uses `const { pendingEdits } = useEditsStore();` (works fine, no changes needed)

## What Still Needs To Be Done ❌

### CRITICAL: Complex Link Token Logic (Lines 199-379)

**Location:** `ui/profile/ProfileEditor.tsx:199-379`

Two massive useEffect blocks that manually compute and call `setPendingEdits`:

1. **Lines 199-258:** Profile field diffs useEffect
   - Handles city changes (`nearestCityId`, `deletedCity`)
   - Computes profile changes manually
   - Calls `setPendingEdits((prev) => ({ ...prev, profile: changed }))`
   - **Problem:** This duplicates logic now in `computePendingEdits()`

2. **Lines 260-379:** Link tokens computation useEffect
   - 120 lines of complex logic
   - Handles: deleted links, new links, URL changes, verification tokens
   - Special tokens: `+!url`, `!id`, `-id`, `+id:url`, `+url`
   - Calls `setPendingEdits((prev) => ({ ...prev, l: filtered }))`
   - **Problem:** This complex logic needs to be integrated into the store

### DECISION NEEDED: How to Handle Complex Link Logic

**Option A: Move to store (ideal but complex)**
- Move all 120 lines into `computePendingEdits()` in the store
- Update store to track `nearestCityId` and `deletedCity`
- Benefit: True single source of truth
- Risk: Complex migration, easy to break edge cases

**Option B: Keep useEffects but use store's linkAuthTokens (simpler)**
- Keep the complex useEffects in ProfileEditor
- Make them read from `linkAuthTokens` store instead of `pendingEdits?.l`
- Use `addLinkAuthToken` / `removeLinkAuthToken` instead of `appendLinkToken` / `removeLinkToken`
- Benefit: Minimal changes to working logic
- Risk: Still some manual syncing

**Recommendation: Start with Option B, then refactor to A if needed**

### Specific Tasks Remaining

1. **Update lines 470-474** - Authentication modal:
   ```typescript
   // Current:
   if (!setPendingEdits) return;
   appendLinkToken(setPendingEdits, authInfoToken);

   // Change to:
   addLinkAuthToken(authInfoToken);
   ```

2. **Update lines 783-791** - Verify button in link rows:
   ```typescript
   // Current:
   if (!setPendingEdits) return;
   if (isPending) {
     removeLinkToken(setPendingEdits, token);
   } else {
     appendLinkToken(setPendingEdits, token);
   }

   // Change to:
   if (isPending) {
     removeLinkAuthToken(token);
   } else {
     addLinkAuthToken(token);
   }
   ```

3. **Refactor lines 199-258** - Profile fields useEffect:
   - **Option A:** Delete entirely, rely on store's `computePendingEdits()`
   - **Option B:** Keep but add city support to store
   - **City fields need to be added to store:**
     ```typescript
     interface FormState {
       // ... existing fields
       nearest_city_id: number | null;
       nearest_city_name: string;
     }
     ```

4. **Refactor lines 260-379** - Link tokens useEffect:
   - This is the hardest part
   - 120 lines of edge case handling
   - Consider: Can we move this logic into `computePendingEdits()`?
   - Or: Keep it but make it update `linkAuthTokens` instead of calling `setPendingEdits`

5. **Update `useVerificationFlow.ts` (Line 235)**
   - Currently calls `setForm` directly
   - Needs to call store's `setForm` instead
   - May need to pass store reference or create a wrapper

6. **Delete unused imports:**
   - Line 11: `appendLinkToken` (after replacing with `addLinkAuthToken`)
   - Line 12: `removeLinkToken` (after replacing with `removeLinkAuthToken`)

7. **Delete this line if city is added to store:**
   - Line 169: `const [deletedCity, setDeletedCity] = useState(false);`

## Important Code Patterns

### Link Token Format
```typescript
"-123"        // Delete link with id=123
"+url"        // Add new link with URL
"+!url"       // Add new link with URL (pending verification)
"!123"        // Verify existing link with id=123
"+123:newurl" // Update link id=123 to new URL
```

### Store Update Pattern (Already Implemented)
```typescript
setForm: (form) =>
  set((state) => {
    const newForm = typeof form === 'function' ? form(state.form) : form;
    return {
      form: newForm,
      pendingEdits: computePendingEdits(newForm, state.original, state.deletedFields, state.linkAuthTokens),
    };
  }),
```

**Every state mutation recomputes `pendingEdits` automatically!**

### How ProfileVerification Uses pendingEdits
File: `ui/verification/ProfileVerification.tsx:40-50`
```typescript
const memo = useMemo(() => {
  const zId = verify.zId ?? profile.id ?? null;
  if (!zId) return "";

  const profileEdits = pendingEdits.profile ?? {};
  const linkTokens = pendingEdits.l ?? [];
  const hasEdits = Object.keys(profileEdits).length > 0 || linkTokens.length > 0;
  const profileDiff = hasEdits ? { ...profileEdits, l: linkTokens } : {};
  return buildZcashEditMemo(profileDiff, String(zId), verify.requestId ?? null);
}, [profile.id, verify.zId, verify.requestId, pendingEdits]);
```

**It just reads `pendingEdits` from the store - no changes needed there!**

## Testing Checklist

After completing the refactor, test:

1. ✅ Edit profile fields (name, bio, etc.) - changes should appear in verification memo
2. ✅ Delete profile fields using checkbox - should add to `d` token array
3. ✅ Add a new link - should appear in `pendingEdits.l`
4. ✅ Delete an existing link - should add `-{id}` token
5. ✅ Change city - should add `c` token
6. ✅ Click "Verify" on a link - should add auth token (`!123` or `+!url`)
7. ✅ Complete OAuth flow - link should become verified
8. ✅ Reset links button - should clear link tokens but preserve auth tokens
9. ✅ No React errors in console about setState during render

## Files Modified So Far

1. ✅ `lib/stores/edits.ts` - Complete rewrite, store now holds form state
2. 🔄 `ui/profile/ProfileEditor.tsx` - Partially updated, needs more work
3. ✅ `app/[slug]/ProfilePage.tsx` - No changes needed (already working)
4. ⬜ `ui/verification/ProfileVerification.tsx` - No changes needed
5. ⬜ `ui/social/useVerificationFlow.ts` - Needs update (line 235)

## Related Files to Review

- `lib/profile/accountAuthFlow.ts` - Defines `appendLinkToken`, `removeLinkToken`, auth flow
- `lib/zcash/zcashUtils.ts` - `buildZcashEditMemo()` consumes `pendingEdits`
- `ui/profile/ProfileCard.tsx` - May read `pendingEdits` for display

## Git Status

Current branch: `dev/jules`

Modified files:
- `lib/stores/edits.ts` - Completely refactored
- `ui/profile/ProfileEditor.tsx` - Partially refactored
- `ui/verification/AmountAndWallet.tsx` - Unrelated (removed dropdown arrow)
- `ui/verification/ProfileVerification.tsx` - Unrelated (pre-fill 0.003 ZEC)
- `lib/stores/messaging.ts` - Unrelated (pre-fill 0.003 ZEC)

**Latest commit:** `6ef9500` "Set verification amount default in store instead of using useEffect"

## Recommendations for Next Agent

1. **Start with the simple auth token replacements** (tasks 1-2 above)
   - Replace `appendLinkToken` → `addLinkAuthToken`
   - Replace `removeLinkToken` → `removeLinkAuthToken`
   - Test that link verification still works

2. **Add city support to the store** (if needed)
   - Add `nearest_city_id` and `nearest_city_name` to `FormState`
   - Add city logic to `computePendingEdits()`
   - Delete the profile fields useEffect (lines 199-258)

3. **Tackle the complex link tokens useEffect** (lines 260-379)
   - Option A: Move logic into `computePendingEdits()` (ideal)
   - Option B: Keep useEffect but make it use `linkAuthTokens` from store
   - Test extensively with all link operations

4. **Update useVerificationFlow** to use store
   - Pass store's `setForm` or wrap it

5. **Clean up**
   - Delete unused imports
   - Delete `deletedCity` local state if moved to store
   - Run the app and test all flows

6. **Commit the changes**
   - Message: "Unify form state and pending edits in store to prevent setState during render"

## Questions to Answer

1. Should `nearestCityId` and `deletedCity` be in the store?
2. Can the 120-line link tokens logic be simplified?
3. Should `useVerificationFlow` be refactored to not need `setForm` directly?
4. Are there other components that call `setForm` on ProfileEditor?

## Success Criteria

✅ No "setState during render" errors
✅ All profile editing works (fields, links, city, avatar)
✅ Link verification (OAuth) still works
✅ Verification memo shows correct pending changes
✅ Reset buttons work correctly
✅ No manual `setPendingEdits` calls in ProfileEditor
✅ `pendingEdits` automatically stays in sync with form state
