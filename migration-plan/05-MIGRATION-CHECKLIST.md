# TypeScript Migration Checklist

**Project**: Zcash.me Directory
**Migration Status**: Ready to Execute
**Last Updated**: 2026-02-08

Use this checklist to track progress through each phase of the TypeScript migration.

---

## PRE-MIGRATION (Complete First)

### Setup Phase
- [ ] Read all migration analysis documents (30 min)
  - [ ] 00-MIGRATION-OVERVIEW.md
  - [ ] 01-COMPONENT-ANALYSIS.md
  - [ ] 02-LIBRARY-ANALYSIS.md
  - [ ] 03-APP-DIRECTORY-ANALYSIS.md
  - [ ] 04-META-PLAN.md (this file)

- [ ] Create Git branch
  ```bash
  git checkout -b feat/typescript-migration
  git pull origin dev
  ```

- [ ] Install TypeScript dependencies
  ```bash
  npm install -D typescript @types/react @types/react-dom @types/node
  ```

- [ ] Create `/tsconfig.json` (see 04-META-PLAN.md for full config)
  - [ ] Set `"strict": true`
  - [ ] Set path aliases `"@/*"`
  - [ ] Configure `"lib": ["ES2020", "DOM", "DOM.Iterable"]`
  - [ ] Set `"jsx": "preserve"`

- [ ] Update `eslint.config.js` for TypeScript
  - [ ] Add TypeScript parser
  - [ ] Add TypeScript ESLint plugin
  - [ ] Update file patterns to include `.ts`, `.tsx`

- [ ] Initial commit
  ```bash
  git add tsconfig.json eslint.config.js
  git commit -m "chore: setup TypeScript configuration"
  ```

- [ ] Verify setup
  - [ ] `npx tsc --version` returns latest
  - [ ] `npm run lint` works
  - [ ] No errors when running linter

**Time**: ~1 hour
**Owner**: One engineer
**Status**: [ ] Complete

---

## PHASE 1: TYPE DEFINITIONS (2-3 hours)

**Goal**: Create all type definition files
**Parallel Work**: No (blocks all other phases)
**Owner**: Senior engineer

### Create Type Files

- [ ] Create `/types/` directory
  ```bash
  mkdir types
  ```

- [ ] Create `/types/index.ts` (core domain models)
  - [ ] Profile type (~30 lines)
  - [ ] Link type (~20 lines)
  - [ ] City type (~10 lines)
  - [ ] Token type (~15 lines)
  - [ ] QuotePayload type (~30 lines)
  - [ ] QuoteResponse type (~20 lines)
  - [ ] RankedProfile type (~10 lines)
  - [ ] Other core types (~50 lines)
  - [ ] **Validation**: `npx tsc --noEmit` passes

- [ ] Create `/types/api.ts` (external API types)
  - [ ] ApiErrorResponse type
  - [ ] FetchResult<T> type
  - [ ] OneClickTokensResponse type
  - [ ] SwapStatusResponse type
  - [ ] **Validation**: Compiles without errors

- [ ] Create `/types/contexts.ts` (context types)
  - [ ] SelectionContextType
  - [ ] EditsContextType
  - [ ] MessagingContextType
  - [ ] SwapContextType (most complex)
  - [ ] **Validation**: All exported types used

- [ ] Create `/types/swap.ts` (swap-specific)
  - [ ] SwapState type
  - [ ] TokenData type
  - [ ] QuoteParams type
  - [ ] SwapContextType details
  - [ ] **Validation**: No conflicts with types/contexts.ts

- [ ] Create `/types/actions.ts` (server action types)
  - [ ] ServerActionResult<T> (discriminated union)
  - [ ] Result<T> generic
  - [ ] SwapActionResults
  - [ ] ProfileActionResults
  - [ ] **Validation**: Used by server actions

- [ ] Create `/types/common.ts` (shared utilities)
  - [ ] ButtonCallback type
  - [ ] FormFieldProps type
  - [ ] ModalControlProps type
  - [ ] DropdownResult<T> type
  - [ ] **Validation**: No circular imports

### Validation

- [ ] All 6 type files created
  - [ ] /types/index.ts
  - [ ] /types/api.ts
  - [ ] /types/contexts.ts
  - [ ] /types/swap.ts
  - [ ] /types/actions.ts
  - [ ] /types/common.ts

- [ ] Type checking
  - [ ] `npx tsc --noEmit` passes (zero errors)
  - [ ] No circular dependencies
  - [ ] No `any` types (use `unknown` if needed)
  - [ ] All types exportable

- [ ] Integration
  - [ ] Types can be imported from `@/lib/types`
  - [ ] No conflicts with existing code
  - [ ] IDE autocomplete works

### Git Commit

```bash
git add types/
git commit -m "types: create foundational type definitions"
```

**Status**: [ ] Complete
**Time Spent**: ___ hours
**Issues**: ___

---

## PHASE 2: COMPONENTS (15-20 hours)

**Goal**: Convert 62 JSX components to .tsx
**Parallel Work**: Yes (multiple engineers can work independently)
**Blocks**: Phase 6 (Providers need typed components)

### Tier 1: Leaf Components (1-2 hours, 12 components)

No dependencies - safe to start immediately

- [ ] HelpIcon (15 min)
  - [ ] Rename to .tsx
  - [ ] Extract prop interface
  - [ ] Add return type annotation
  - [ ] Test: `npm run build` passes

- [ ] ProgressStep (15 min)
- [ ] ZcashAddressInput (30 min)
- [ ] StepContainer (15 min)
- [ ] ReferRankBadgeMulti (15 min)
- [ ] LetterGridModal (30 min)
- [ ] CopyButton (15 min)
- [ ] AlphabetSidebar (30 min)
- [ ] QrUriBlock (30 min)
- [ ] LinkInput (30 min)
- [ ] VerifiedBadge (15 min)
- [ ] HelpMessage (15 min)

**Validation**:
- [ ] All 12 components converted
- [ ] `npm run build` succeeds
- [ ] No `any` types
- [ ] All prop interfaces defined

**Git Commit**:
```bash
git commit -m "components: convert Tier 1 leaf components to TypeScript"
```

### Tier 2: Single-Dependency Components (2-3 hours, 18 components)

Depends on Tier 1 and lib utilities

- [ ] ProfileField (20 min)
- [ ] ModalPortal (15 min)
- [ ] SocialLinkInput (20 min)
- [ ] CitySearchDropdown (20 min)
- [ ] ProfileAvatar (20 min)
- [ ] [13 more components] (110 min)

**Actions**:
- [ ] Import typed dependencies
- [ ] Type all context usage (useSelection(), etc.)
- [ ] Type all callbacks with explicit signatures
- [ ] Add prop interfaces

**Validation**:
- [ ] All 18 components converted
- [ ] `npm run build` succeeds
- [ ] Imports from Tier 1 work
- [ ] Context hooks properly typed

**Git Commit**:
```bash
git commit -m "components: convert Tier 2 single-dependency components"
```

### Tier 3: Complex Composed Components (8-10 hours, 12 components)

Highest complexity - prioritize experienced engineer

- [ ] ProfileCard (2-3 hours)
  - [ ] 8 child component imports
  - [ ] Flip animation
  - [ ] Polymorphic props
  - [ ] Context usage
  - [ ] Test: npm run build succeeds

- [ ] ProfileEditor (2-3 hours)
  - [ ] Multiple form fields
  - [ ] Link/social inputs
  - [ ] Validation
  - [ ] Modal integration
  - [ ] Test: Compiles

- [ ] AmountAndWallet (2 hours)
  - [ ] 60+ props handling
  - [ ] Polymorphic behavior
  - [ ] Token selection
  - [ ] Refund address input
  - [ ] Test: Props properly typed

- [ ] AddUserForm (2 hours)
  - [ ] Multi-step form
  - [ ] Multiple inputs
  - [ ] Form validation
  - [ ] Test: Compiles

- [ ] ProfileVerification (1.5 hours)
- [ ] MemoComposer (1.5 hours)
- [ ] [6 more components] (3 hours)

**Validation**:
- [ ] All 62 components converted
- [ ] `npm run build` succeeds
- [ ] All props interfaces created
- [ ] No implicit any types
- [ ] `npm run dev` runs without warnings

**Git Commit**:
```bash
git commit -m "components: convert Tier 3 complex composed components"
```

**Phase 2 Status**: [ ] Complete
**Time Spent**: ___ hours

---

## PHASE 3: LIBRARY UTILITIES (18-25 hours)

**Goal**: Convert 23 utility files
**Parallel Work**: Yes (can work alongside Phase 2)
**Blocks**: Phase 4 (server actions depend on typed utilities)

### Tier 1: No Dependencies (4 hours, 4 files)

Start immediately

- [ ] swapPayload.ts (2 hours)
  - [ ] toBaseUnits function
  - [ ] baseUnitsToDecimal function
  - [ ] buildQuotePayload function
  - [ ] intBps helper
  - [ ] Type QuotePayload interface
  - [ ] Test: `npx tsc --noEmit` passes

- [ ] addressValidation.ts (1.5 hours)
  - [ ] validateAddressForBlockchain function
  - [ ] Per-blockchain validators
  - [ ] ValidationResult type
  - [ ] Test: Type checking passes

- [ ] tokenUtils.ts (30 min)
  - [ ] parseTokenSymbol function
  - [ ] Simple types
  - [ ] Test: Compiles

- [ ] validateUrl.ts (1 hour)
  - [ ] isValidUrl function
  - [ ] URL validation rules
  - [ ] Validation result type
  - [ ] Test: Compiles

**Validation**:
- [ ] All 4 files converted
- [ ] No external dependencies used
- [ ] Return types properly typed
- [ ] `npx tsc --noEmit` passes

**Git Commit**:
```bash
git commit -m "lib: convert Tier 1 utilities (no dependencies)"
```

### Tier 2: Supabase-Dependent (6 hours, 7 files)

After supabase-server.ts

- [ ] supabase-server.ts (1 hour) - PREREQUISITE
  - [ ] createSupabaseServerClient function
  - [ ] Return type: SupabaseClient | null
  - [ ] Env var checking
  - [ ] Test: Works with existing code

- [ ] searchCities.ts (1 hour)
- [ ] searchProfiles.ts (1.5 hours)
- [ ] profileQueries.ts (1 hour)
- [ ] verifyLinkDb.ts (1.5 hours)
- [ ] createProfile.ts (1 hour)
- [ ] confirmOtp.ts (1 hour)

**Actions**:
- [ ] Type Supabase responses
- [ ] Type error handling
- [ ] Create response interfaces
- [ ] Test Supabase integration

**Validation**:
- [ ] All 7 files converted
- [ ] Supabase types imported
- [ ] Error handling typed
- [ ] `npm run build` succeeds

**Git Commit**:
```bash
git commit -m "lib: convert Tier 2 utilities (Supabase-dependent)"
```

### Tier 3: Transform Functions (6 hours, 4 files)

Pure functions - no external deps

- [ ] profileLinks.ts (2 hours)
  - [ ] enrichLink function
  - [ ] Domain mapping
  - [ ] Handle extraction
  - [ ] Icon/label lookup
  - [ ] Test: Proper enrichment

- [ ] profileUtils.ts (2 hours)
  - [ ] getProfileTrust function
  - [ ] getWarningConfig function (complex!)
  - [ ] getRankType function
  - [ ] Other utility functions
  - [ ] Test: All conditional branches covered

- [ ] usernameNormalizer.ts (1 hour)
- [ ] zcashUtils.ts (1 hour)

**Validation**:
- [ ] All 4 files converted
- [ ] Discriminated unions used
- [ ] `as const` for mappings
- [ ] Complex logic well-typed

**Git Commit**:
```bash
git commit -m "lib: convert Tier 3 utilities (transforms)"
```

### Tier 4: External API Integration (5-7 hours, 2 files) - COMPLEX

Highest complexity - experienced engineer

- [ ] oneClick.ts (3-4 hours)
  - [ ] oneclickTokens function
  - [ ] oneclickQuote function
  - [ ] oneclickStatus function
  - [ ] oneclickDepositSubmit function
  - [ ] Token filtering pipeline
  - [ ] Error extraction logic
  - [ ] Timeout handling
  - [ ] Test with actual API

- [ ] profileFetcher.ts (2-3 hours)
  - [ ] fetchProfileForSlug function
  - [ ] Multi-stage lookup
  - [ ] Promise.all for rankings
  - [ ] Slug normalization
  - [ ] Map-based merging
  - [ ] Test: All fallback paths work

**Validation**:
- [ ] Both files converted
- [ ] API response shapes typed
- [ ] Error handling complete
- [ ] Promise patterns correctly typed

**Git Commit**:
```bash
git commit -m "lib: convert Tier 4 utilities (external APIs) - COMPLEX"
```

### Tier 5: Additional (2 hours, 2 files)

- [ ] fetchTokens.ts (1 hour)
  - [ ] unstable_cache wrapper
  - [ ] Revalidation config
  - [ ] Return type: Token[]

- [ ] getRateAction.ts (1 hour)
  - [ ] Provider fallback pattern
  - [ ] Custom parser functions
  - [ ] RateResponse type

**Validation**:
- [ ] Both files converted
- [ ] Caching patterns typed
- [ ] Fallback logic clear

**Git Commit**:
```bash
git commit -m "lib: convert Tier 5 utilities (caching and rates)"
```

**Phase 3 Status**: [ ] Complete
**Time Spent**: ___ hours

---

## PHASE 4: SERVER ACTIONS (10-15 hours)

**Goal**: Convert 13 server actions
**Depends On**: Phase 3 (utilities must be typed first)
**Parallel Work**: Yes (after Phase 3 80% done)

### Group 1: Simple Wrappers (3 hours, 7 actions)

- [ ] confirmOtpAction.ts (30 min)
- [ ] updateLinkVerificationAction.ts (30 min)
- [ ] checkAddressTakenAction.ts (30 min)
- [ ] checkUsernameExistsAction.ts (30 min)
- [ ] checkUsernameIsVerifiedAction.ts (30 min)
- [ ] getProfileLinksAction.ts (30 min)
- [ ] getProfileLinksBatchAction.ts (1 hour)

**Pattern**:
```typescript
export async function action(params: T): Promise<Result<U>> {
  try {
    // ...
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: message };
  }
}
```

**Validation**:
- [ ] All 7 actions converted
- [ ] Return types are discriminated unions
- [ ] Error handling complete
- [ ] `npm run build` succeeds

**Git Commit**:
```bash
git commit -m "actions: convert Group 1-2 simple server actions"
```

### Group 2: Search Operations (2 hours, 2 actions)

- [ ] searchCitiesAction.ts (1 hour)
- [ ] searchProfilesAction.ts (1 hour, 2 functions)

### Group 3: Profile Creation (2 hours, 1 file)

- [ ] createProfileAction.ts (2 hours)
  - [ ] createProfile function
  - [ ] insertProfileLinks function
  - [ ] checkAddressTaken function
  - [ ] checkUsername* functions
  - [ ] Multiple exported functions
  - [ ] Sequential logic

**Validation**:
- [ ] All functions typed
- [ ] Error aggregation handled
- [ ] Returns properly structured

**Git Commit**:
```bash
git commit -m "actions: convert Group 3 profile creation"
```

### Group 4: Complex with Rankings (3 hours, 1 action) - COMPLEX

- [ ] getNsProfilesAction.ts (3 hours)
  - [ ] Promise.all for 3 parallel queries
  - [ ] Pagination loop
  - [ ] Map-based enrichment
  - [ ] Type tuple results: `[A, B, C]`
  - [ ] Type coercion (String(id))

**Validation**:
- [ ] Promise.all typing correct
- [ ] Accumulation logic typed
- [ ] Return type: ProfileWithRankings[]
- [ ] Works with mock data

**Git Commit**:
```bash
git commit -m "actions: convert Group 4 complex server actions"
```

### Group 5: Swap Operations (4-6 hours, 3 actions) - COMPLEX

- [ ] quoteAction.ts (2-3 hours)
  - [ ] 4-stage async chain
  - [ ] Error handling at each stage
  - [ ] retryable flag logic
  - [ ] Display formatting
  - [ ] Test: All stages work

- [ ] confirmAction.ts (2-3 hours)
  - [ ] Similar to quoteAction
  - [ ] Additional payload building
  - [ ] Deposit field extraction

- [ ] depositAction.ts (1 hour)
  - [ ] Simple API call
  - [ ] Basic error handling

- [ ] (fetchTokens.ts - done in Phase 3)
- [ ] (getRateAction.ts - done in Phase 3)

**Validation**:
- [ ] All 3 actions converted
- [ ] Promise chains properly typed
- [ ] Error messages user-friendly
- [ ] Return types discriminated unions

**Git Commit**:
```bash
git commit -m "actions: convert Group 5 swap operations - COMPLEX"
```

**Phase 4 Status**: [ ] Complete
**Time Spent**: ___ hours

---

## PHASE 5: PAGES & API ROUTES (8-12 hours)

**Goal**: Convert 2 API routes, 6 pages, 3 layouts
**Parallel Work**: Yes (can start after Phase 1)
**Blocks**: None (but depends on typed libraries)

### API Routes (2 hours, 2 files)

- [ ] app/api/search/route.ts (1 hour)
  - [ ] Type NextRequest/NextResponse
  - [ ] Validate query parameters
  - [ ] Call typed server actions
  - [ ] Return typed JSON
  - [ ] Test: API responds correctly

- [ ] app/api/swap/status/route.ts (1 hour)
  - [ ] Same pattern as search
  - [ ] Handle missing params
  - [ ] External API call
  - [ ] Error handling

**Validation**:
- [ ] Both routes typed
- [ ] NextRequest/Response imported
- [ ] Query validation working
- [ ] API calls typed

**Git Commit**:
```bash
git commit -m "app: convert API routes to TypeScript"
```

### Layouts (1 hour, 3 files)

- [ ] app/layout.tsx (15 min)
  - [ ] Import Metadata
  - [ ] Export metadata object
  - [ ] Type children prop

- [ ] app/[slug]/layout.tsx (15 min)
  - [ ] Type children + params
  - [ ] Import Providers
  - [ ] Wrap in providers

- [ ] app/ns/layout.tsx (optional, 15 min)

**Validation**:
- [ ] All layouts typed
- [ ] Metadata properly exported
- [ ] Children typed as React.ReactNode

**Git Commit**:
```bash
git commit -m "app: convert layouts to TypeScript"
```

### Server Pages (6 hours, 5 files)

- [ ] app/page.tsx (1.5 hours)
  - [ ] Import Metadata type
  - [ ] Export metadata object
  - [ ] Async function
  - [ ] Parallel data fetching
  - [ ] Pass initial data to client component
  - [ ] Test: Home page renders

- [ ] app/[slug]/page.tsx (2 hours) - CRITICAL
  - [ ] Type params as Promise<{ slug: string }>
  - [ ] **CRITICAL**: Await params in component
  - [ ] generateMetadata function (async)
  - [ ] Optional: generateStaticParams
  - [ ] Use notFound() for missing profiles
  - [ ] Test: Slug routing works

- [ ] app/ns/page.tsx (1 hour)
  - [ ] export const dynamic = "force-dynamic"
  - [ ] Fetch data
  - [ ] Pass to client component

- [ ] app/privacy/page.tsx (30 min)
  - [ ] Static content
  - [ ] Type return

- [ ] app/terms/page.tsx (30 min)
  - [ ] Static content
  - [ ] Type return

**Critical Patterns**:
```typescript
interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params // MUST await!
}
```

**Validation**:
- [ ] All 5 pages typed
- [ ] Async params handled correctly
- [ ] Metadata properly typed
- [ ] `npm run build` succeeds
- [ ] Routes work in browser

**Git Commit**:
```bash
git commit -m "app: convert pages to TypeScript - CRITICAL: async params"
```

### Client Page Components (4 hours, 4 components)

Not files but top-level components used by pages

- [ ] app/HomePage.tsx (1.5 hours)
  - [ ] Type props from server page
  - [ ] useState for animations
  - [ ] useRouter import/usage
  - [ ] Framer Motion typing
  - [ ] Test: Home loads and animates

- [ ] app/swap/page.tsx (1.5 hours)
  - [ ] useRouter, useSearchParams
  - [ ] Complex polling logic
  - [ ] State management
  - [ ] Sub-component typing
  - [ ] Test: Swap workflow works

- [ ] app/[slug]/ProfilePage.tsx (1 hour)
  - [ ] Type props
  - [ ] Context usage
  - [ ] Multiple context hooks
  - [ ] Test: Renders with contexts

- [ ] app/ns/DirectoryNS.tsx (1.5 hours)
  - [ ] Large component (437 lines)
  - [ ] Convert incrementally
  - [ ] Custom hooks typing
  - [ ] Test: Directory renders

**Validation**:
- [ ] All client components typed
- [ ] Props properly passed from server pages
- [ ] Context hooks properly typed
- [ ] `npm run dev` works without warnings

**Git Commit**:
```bash
git commit -m "app: convert client page components to TypeScript"
```

**Phase 5 Status**: [ ] Complete
**Time Spent**: ___ hours

---

## PHASE 6: CONTEXT PROVIDERS & HOOKS (8-10 hours)

**Goal**: Convert 4 providers and 8 custom hooks
**Depends On**: Phase 2 (components are typed)
**Can Start**: After Phase 2 is mostly done

### Providers (5-6 hours, 4 context files + 1 composition)

- [ ] app/[slug]/providers/selection-provider.tsx (30 min)
  - [ ] Create SelectionContext
  - [ ] Type SelectionContextType
  - [ ] Export SelectionProvider component
  - [ ] Export useSelection hook
  - [ ] Test: Hook accessible in components

- [ ] app/[slug]/providers/edits-provider.tsx (1 hour)
  - [ ] EditsContext + EditsContextType
  - [ ] EditsProvider component
  - [ ] useEdits hook
  - [ ] useCallback for handlers
  - [ ] Test: State updates work

- [ ] app/[slug]/providers/messaging-provider.tsx (1.5 hours)
  - [ ] MessagingContext + type
  - [ ] Dual-mode state (draft/verify)
  - [ ] Multiple setters
  - [ ] MessagingProvider component
  - [ ] useMessaging hook
  - [ ] Test: Mode switching works

- [ ] app/[slug]/providers/swap-provider.tsx (3-4 hours) - COMPLEX
  - [ ] SwapContext + complex SwapContextType
  - [ ] 10+ state fields
  - [ ] Async actions (getQuote, confirmSwap, loadTokens)
  - [ ] Computed properties
  - [ ] SwapProvider component
  - [ ] useSwap hook
  - [ ] Test: Complex state management works

- [ ] app/[slug]/providers.tsx (15 min)
  - [ ] Import all 4 providers
  - [ ] Compose providers
  - [ ] Export Providers component
  - [ ] Type children prop

**Validation**:
- [ ] All 4 providers converted
- [ ] useContext hooks work in components
- [ ] Error thrown if used outside provider
- [ ] `npm run dev` works
- [ ] Context state updates visible

**Duplicate for NS Directory** (1 hour):
- [ ] app/ns/providers/ (same pattern)
- [ ] ns-selection-provider.tsx
- [ ] ns-edits-provider.tsx
- [ ] ns-messaging-provider.tsx
- [ ] ns-swap-provider.tsx
- [ ] ns-providers.tsx

**Git Commit**:
```bash
git commit -m "providers: convert context providers to TypeScript with typed hooks"
```

### Custom Hooks (3-4 hours, 8 hooks)

All client-side hooks with `useState`, `useEffect`, etc.

- [ ] app/[slug]/providers/useVerificationPolling.ts (1.5 hours)
  - [ ] useEffect for polling loop
  - [ ] Timeout handling
  - [ ] Return type with status/isPolling/error
  - [ ] Callback options

- [ ] app/ns/hooks/useNsDirectory.ts (1 hour)
  - [ ] useEffect for batch fetch
  - [ ] useState for data
  - [ ] Return type clearly defined
  - [ ] Custom callback

- [ ] app/ns/hooks/useProfileModal.ts (1 hour)
  - [ ] Modal state management
  - [ ] useState, useCallback

- [ ] app/ns/hooks/useNsFilters.ts (1 hour)
  - [ ] Filter state
  - [ ] Search query
  - [ ] Callbacks

- [ ] app/ns/hooks/useNsCounts.ts (1 hour)
  - [ ] Computed counts
  - [ ] useMemo optimization

- [ ] app/ns/hooks/useFlightPaths.ts (1 hour)
  - [ ] Animation calculations
  - [ ] Return typed arrays

- [ ] app/ns/hooks/useProfileEvents.ts (1 hour)
  - [ ] Event tracking
  - [ ] useCallback

- [ ] app/ns/hooks/useEmojiAutocomplete.ts (1 hour)
  - [ ] Emoji lookup
  - [ ] Textarea ref handling

**Hook Pattern**:
```typescript
export function useHook(): ReturnType {
  const [state, setState] = useState<T>();
  // ...
  return { state, callback, error };
}
```

**Validation**:
- [ ] All 8 hooks converted
- [ ] Return types explicit
- [ ] Dependencies arrays complete
- [ ] No lint warnings

**Git Commit**:
```bash
git commit -m "hooks: convert custom hooks to TypeScript"
```

**Phase 6 Status**: [ ] Complete
**Time Spent**: ___ hours

---

## PHASE 7: STRICT MODE & POLISH (4-6 hours)

**Goal**: Enable strict TypeScript and fix remaining issues
**Depends On**: All previous phases

### Enable Strict Mode (1 hour)

- [ ] Update tsconfig.json
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "noImplicitAny": true,
      "strictNullChecks": true,
      "noImplicitThis": true
    }
  }
  ```

- [ ] Run type checker
  ```bash
  npx tsc --noEmit
  ```

- [ ] Fix strict mode errors
  - [ ] Add explicit type annotations
  - [ ] Remove unused variables
  - [ ] Handle null/undefined
  - [ ] Fix implicit returns
  - [ ] Recount: how many errors to fix?

**Validation**:
- [ ] `npx tsc --noEmit` passes (zero errors)

### Full Build Check (1-2 hours)

- [ ] Run production build
  ```bash
  npm run build
  ```

- [ ] Fix build errors
  - [ ] Missing prop types
  - [ ] Type mismatches
  - [ ] Return type issues
  - [ ] Promise typing
  - [ ] Recount: how many errors?

- [ ] Run dev server
  ```bash
  npm run dev
  ```

- [ ] Check for warnings
  - [ ] Any type warnings?
  - [ ] Unused import warnings?
  - [ ] Type checking warnings?

**Validation**:
- [ ] `npm run build` succeeds (zero errors)
- [ ] `npm run dev` starts (zero type warnings)

### ESLint TypeScript Rules (1 hour)

- [ ] Verify eslint.config.js has TypeScript rules
- [ ] Run linter
  ```bash
  npm run lint
  ```

- [ ] Fix linting issues
  - [ ] No-explicit-any violations
  - [ ] Unused variable warnings
  - [ ] Async return types
  - [ ] Type definition order

**Validation**:
- [ ] `npm run lint` passes (zero errors)

### Manual Type Audits (1-2 hours)

Review high-risk files for type safety:

- [ ] lib/swap/oneClick.ts
  - [ ] API response shapes typed
  - [ ] Error extraction safe
  - [ ] No `any` types

- [ ] lib/profile/profileFetcher.ts
  - [ ] Promise.all tuple typed
  - [ ] Merge logic type-safe
  - [ ] All stages typed

- [ ] lib/swap/swapPayload.ts
  - [ ] BigInt operations safe
  - [ ] Decimal conversions typed
  - [ ] Validation discriminated

- [ ] app/[slug]/providers/swap-provider.tsx
  - [ ] Complex state typed
  - [ ] Async actions return correct types
  - [ ] No implicit any

- [ ] app/[slug]/page.tsx
  - [ ] Async params correctly awaited
  - [ ] Metadata async function works
  - [ ] Routes properly typed

**Type Coverage Check**:
```bash
# Estimate type coverage (>95% target)
# Count files with explicit types vs any types
```

### Documentation (30 min)

- [ ] Create MIGRATION.md
  - [ ] Summary of changes
  - [ ] New type patterns
  - [ ] Migration date

- [ ] Create TYPE_PATTERNS.md
  - [ ] Discriminated unions pattern
  - [ ] Context provider pattern
  - [ ] Async/Promise pattern
  - [ ] Server action pattern

- [ ] Create CONTEXT_GUIDE.md
  - [ ] How to use SelectionProvider
  - [ ] How to use EditsProvider
  - [ ] How to use MessagingProvider
  - [ ] How to use SwapProvider
  - [ ] Accessing context state in components

- [ ] Add comments to complex files
  - [ ] Type definitions (why shaped this way)
  - [ ] Generic constraints (why T extends X)
  - [ ] Breaking patterns (why different approach)

**Validation**:
- [ ] `npm run build` succeeds (zero errors)
- [ ] `npm run lint` succeeds (zero errors)
- [ ] `npx tsc --noEmit` succeeds (zero errors)
- [ ] `npm run dev` succeeds (zero warnings)
- [ ] Type coverage >95%
- [ ] Documentation complete

**Git Commits**:
```bash
git commit -m "chore: enable strict TypeScript mode"
git commit -m "chore: fix strict mode type errors"
git commit -m "docs: add TypeScript migration documentation"
```

**Phase 7 Status**: [ ] Complete
**Time Spent**: ___ hours

---

## MANUAL TESTING (2-4 hours)

After all phases complete, manually test the application:

### Routes Testing
- [ ] Home page (/)
  - [ ] Page loads
  - [ ] Featured profiles display
  - [ ] Profile count shows
  - [ ] No console errors

- [ ] Profile page (/[slug])
  - [ ] Profile displays for existing slug
  - [ ] 404 for non-existent slug
  - [ ] Profile card shows info
  - [ ] Links display correctly

- [ ] Swap page (/swap)
  - [ ] Page loads
  - [ ] Tokens load
  - [ ] Can select token
  - [ ] Can enter amount
  - [ ] Quote requests work
  - [ ] No type errors in console

- [ ] NS Directory (/ns)
  - [ ] Profiles load
  - [ ] Rankings display
  - [ ] Search works
  - [ ] Pagination works (if applicable)

- [ ] Static pages
  - [ ] /privacy loads
  - [ ] /terms loads

### API Testing
- [ ] /api/search
  ```bash
  curl "http://localhost:3000/api/search?q=test&limit=3"
  ```
  - [ ] Returns typed response
  - [ ] Handles missing params
  - [ ] Error handling works

- [ ] /api/swap/status
  ```bash
  curl "http://localhost:3000/api/swap/status?depositAddress=..."
  ```
  - [ ] Returns typed response
  - [ ] Validates params
  - [ ] Error handling works

### Context Testing
- [ ] SelectionProvider
  - [ ] forceShowQR state changes
  - [ ] Updates persist

- [ ] EditsProvider
  - [ ] pendingEdits state updates
  - [ ] setPendingEdits works
  - [ ] clearPendingEdits works

- [ ] MessagingProvider
  - [ ] Mode switching works
  - [ ] Draft/verify state separate
  - [ ] State updates visible

- [ ] SwapProvider
  - [ ] Token loading works
  - [ ] Quote fetching works
  - [ ] State updates properly
  - [ ] Async actions complete

### Browser Console
- [ ] No TypeScript errors
- [ ] No runtime type errors
- [ ] No unused variable warnings
- [ ] No deprecation warnings

**Validation Checklist**:
- [ ] All routes clickable and functional
- [ ] All API endpoints respond correctly
- [ ] All context providers work
- [ ] No console errors
- [ ] No type warnings
- [ ] Build succeeds
- [ ] Dev server runs smoothly

**Testing Summary**:
- Routes tested: ___ / 8
- API endpoints tested: ___ / 2
- Providers tested: ___ / 4
- Console errors: ___
- Type issues found: ___

---

## FINAL CHECKLIST (Before Merge)

- [ ] All 116 files converted
  - [ ] 62 components .tsx
  - [ ] 23 utilities .ts
  - [ ] 13 server actions .ts
  - [ ] 8 pages/layouts .tsx
  - [ ] 2 API routes .ts
  - [ ] 4 providers .tsx
  - [ ] 8 hooks .ts
  - [ ] 6 type files .ts

- [ ] Build & Development
  - [ ] `npm run build` succeeds (zero errors)
  - [ ] `npm run dev` runs (zero warnings)
  - [ ] `npx tsc --noEmit` passes (zero errors)
  - [ ] `npm run lint` passes (zero errors)

- [ ] Type Safety
  - [ ] Type coverage >95%
  - [ ] No implicit `any` types
  - [ ] All error cases typed
  - [ ] All contexts properly typed

- [ ] Testing
  - [ ] All routes tested
  - [ ] All APIs tested
  - [ ] All providers tested
  - [ ] No console errors
  - [ ] Manual test suite passed

- [ ] Code Quality
  - [ ] No commented-out code
  - [ ] Consistent naming
  - [ ] Proper imports/exports
  - [ ] No dead code

- [ ] Documentation
  - [ ] MIGRATION.md created
  - [ ] TYPE_PATTERNS.md created
  - [ ] CONTEXT_GUIDE.md created
  - [ ] Complex code has comments

- [ ] Git History
  - [ ] Logical commits per phase
  - [ ] Clear commit messages
  - [ ] No merge conflicts
  - [ ] Clean git log

- [ ] Code Review
  - [ ] All phases reviewed
  - [ ] No type safety concerns
  - [ ] Feedback addressed
  - [ ] Team approved

- [ ] Cleanup
  - [ ] jsconfig.json removed (if not needed)
  - [ ] No temporary files left
  - [ ] No debug code left
  - [ ] .env files secure

---

## GIT COMMIT SUMMARY

```bash
# Setup
git commit -m "chore: setup TypeScript configuration"

# Types
git commit -m "types: create foundational type definitions"

# Components
git commit -m "components: convert Tier 1 leaf components to TypeScript"
git commit -m "components: convert Tier 2 single-dependency components"
git commit -m "components: convert Tier 3 complex composed components"

# Lib
git commit -m "lib: convert Tier 1 utilities (no dependencies)"
git commit -m "lib: convert Tier 2 utilities (Supabase-dependent)"
git commit -m "lib: convert Tier 3 utilities (transforms)"
git commit -m "lib: convert Tier 4 utilities (external APIs) - COMPLEX"
git commit -m "lib: convert Tier 5 utilities (caching and rates)"

# Server Actions
git commit -m "actions: convert Group 1-2 simple server actions"
git commit -m "actions: convert Group 3 profile creation"
git commit -m "actions: convert Group 4 complex server actions"
git commit -m "actions: convert Group 5 swap operations - COMPLEX"

# App
git commit -m "app: convert API routes to TypeScript"
git commit -m "app: convert pages and layouts to TypeScript"
git commit -m "app: convert client page components to TypeScript - CRITICAL async params"

# Providers
git commit -m "providers: convert context providers to TypeScript with typed hooks"
git commit -m "hooks: convert custom hooks to TypeScript"

# Polish
git commit -m "chore: enable strict TypeScript mode"
git commit -m "chore: fix strict mode type errors"
git commit -m "docs: add TypeScript migration documentation"

# Create PR
gh pr create --title "feat: migrate codebase to TypeScript" \
  --body "Convert all 116 JS/JSX files to TS/TSX with full type safety. See migration-plan/ for details."
```

---

## POST-MIGRATION

- [ ] Merge PR to main
- [ ] Update CI/CD if TypeScript checks added
- [ ] Announce migration to team
- [ ] Share documentation with team
- [ ] Collect team feedback
- [ ] Monitor for any type issues
- [ ] Consider adding E2E tests (now with type safety)
- [ ] Plan next improvements (Zod validation, etc.)

---

## OVERALL PROJECT STATUS

**Total Time Estimated**: 68-95 hours
**Total Time Spent**: ___ hours
**Completion**: ____%

**Phase Status**:
- [ ] Phase 0: Setup (1 hour) - [ ] Complete
- [ ] Phase 1: Types (2-3 hours) - [ ] Complete
- [ ] Phase 2: Components (15-20 hours) - [ ] Complete
- [ ] Phase 3: Lib (18-25 hours) - [ ] Complete
- [ ] Phase 4: Actions (10-15 hours) - [ ] Complete
- [ ] Phase 5: Pages (8-12 hours) - [ ] Complete
- [ ] Phase 6: Providers (8-10 hours) - [ ] Complete
- [ ] Phase 7: Polish (4-6 hours) - [ ] Complete

**Issues Encountered**:
1. ___
2. ___
3. ___

**Lessons Learned**:
1. ___
2. ___
3. ___

**Final Notes**:
___

---

**Last Updated**: 2026-02-08
**Prepared By**: TypeScript Migration Team
**Approved By**: ___
