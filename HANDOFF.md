# Provider Organization Issue

## Problem

The context providers are scattered and duplicated across the codebase in inconsistent locations:

### Current Structure (Problematic)
```
app/
  providers.jsx              # Root-level wrapper (not actually imported)
  layout.jsx                 # Root layout (doesn't use providers)
  [slug]/
    layout.jsx               # Imports Providers from ../providers
    ProfilePage.jsx

ui/
  swap/
    SwapComposer.jsx         # Exports SwapProvider (context definition)
    SwapProvider.jsx         # Duplicate SwapProvider (same as above)
  messaging/
    MemoComposer.jsx
  profile/
    ...
```

### Issues
1. **Duplicate Definitions**: `SwapProvider` is defined in both `ui/swap/SwapComposer.jsx` and `ui/swap/SwapProvider.jsx`
2. **Wrong Location**: Context providers (`SwapProvider`, etc.) live in `ui/` folder, which should only contain UI components
3. **Inconsistent Structure**: Root `app/providers.jsx` exists but isn't used; actual providers are scattered
4. **Scoping Confusion**: Providers are only used in `[slug]` route but aren't located there

## Proposed Solution

Move all providers to `app/[slug]/providers/` since they're **only used on profile pages**:

```
app/
  [slug]/
    providers/               # ← New scoped providers folder
      index.js               # Exports root Providers component
      SelectionProvider.jsx
      EditsProvider.jsx
      MessagingProvider.jsx
      SwapProvider.jsx
    layout.jsx               # Import Providers from ./providers
    ProfilePage.jsx
  layout.jsx                 # Root layout (no providers)

ui/
  swap/
    SwapComposer.jsx         # UI only - uses useContext(SwapContext)
    SwapRecipientInfo.jsx
  messaging/
    MemoComposer.jsx
  profile/
    ProfileCard.jsx
    ...
```

## Files to Migrate

### Delete
- `app/providers.jsx` (dead code, replaced by `app/[slug]/providers/index.js`)
- `ui/swap/SwapProvider.jsx` (duplicate)

### Create
- `app/[slug]/providers/index.js`
- `app/[slug]/providers/SelectionProvider.jsx`
- `app/[slug]/providers/EditsProvider.jsx`
- `app/[slug]/providers/MessagingProvider.jsx`
- `app/[slug]/providers/SwapProvider.jsx`

### Update
- `app/[slug]/layout.jsx` - Change import from `../providers` to `./providers`
- `ui/swap/SwapComposer.jsx` - Remove `SwapProvider` export, keep only UI components
- `ui/swap/useSwapContext.js` - Create custom hook for easier context access (optional)

## Benefits

- ✅ Providers co-located with their usage scope
- ✅ Clear separation: `app/[slug]/providers/` = context, `ui/` = UI components only
- ✅ No more dead code or duplicates
- ✅ Follows Next.js App Router conventions
- ✅ Easier to understand provider dependencies

## Testing

After refactoring:
1. Profile pages (`/profile/[slug]`) should render normally
2. All swap, messaging, and selection features should work
3. No console errors about missing context providers
