# TypeScript Migration Meta-Plan: Complete Execution Roadmap

**Project**: Zcash.me Directory - JavaScript to TypeScript Migration
**Start Date**: 2026-02-08
**Total Estimated Effort**: 68-95 hours
**Recommended Duration**: 1.7-2.4 weeks (solo) or 1-2 weeks (2-3 engineers)
**Risk Level**: Medium (heavy async, complex context state, no automated tests)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Pre-Migration Setup](#pre-migration-setup)
3. [Detailed Phase Breakdown](#detailed-phase-breakdown)
4. [Parallel Work Streams](#parallel-work-streams)
5. [Timeline & Milestones](#timeline--milestones)
6. [Risk Mitigation](#risk-mitigation)
7. [Daily Standup Template](#daily-standup-template)
8. [Success Criteria](#success-criteria)

---

## Executive Summary

### Scope
- **116 JavaScript/JSX files** converting to TypeScript
- **62 React components** in `/ui/` with prop interfaces
- **23 utility files + 13 server actions** in `/lib/` with async typing
- **8 pages/layouts, 2 API routes, 4 providers, 8 hooks** in `/app/`
- **~14,000 lines of code** total

### Effort Breakdown
| Phase | Task | Hours | Critical Path |
|-------|------|-------|----------------|
| 0 | Setup (TypeScript, tsconfig) | 3-4 | Yes |
| 1 | Type definitions (types/*.ts) | 2-3 | **Yes** |
| 2 | Component migration (62 files) | 15-20 | Yes |
| 3 | Lib utilities (23 files) | 18-25 | Yes |
| 4 | Server actions (13 files) | 10-15 | Depends on Phase 3 |
| 5 | Pages/API routes (8 files) | 8-12 | Can start after Phase 1 |
| 6 | Providers/Hooks (12 files) | 8-10 | Depends on Phase 2 |
| 7 | Polish & strict mode | 4-6 | **Yes** |
| **TOTAL** | | **68-95 hours** | |

### Success Criteria
- ✅ All 116 files converted to .ts/.tsx
- ✅ `npm run build` succeeds, zero type errors
- ✅ `npm run dev` runs, zero type warnings
- ✅ Manual test suite passes (all routes clickable)
- ✅ Strict mode enabled (`"strict": true`)
- ✅ Type coverage >95%

---

## Pre-Migration Setup

### 1. Preparation (30 minutes)
```bash
# Read all analysis documents
# Time: ~30 minutes
# Docs:
# - 00-MIGRATION-OVERVIEW.md (5 min)
# - 01-COMPONENT-ANALYSIS.md (10 min)
# - 02-LIBRARY-ANALYSIS.md (10 min)
# - 03-APP-DIRECTORY-ANALYSIS.md (5 min)

# Create a Git branch for migration
git checkout -b feat/typescript-migration
git pull origin dev
```

### 2. Dependency Installation (10 minutes)
```bash
npm install -D typescript @types/react @types/react-dom @types/node

# Verify installation
npx tsc --version  # Should be latest TypeScript
```

### 3. Generate tsconfig.json (15 minutes)
Create `/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "incremental": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["app/**/*", "lib/**/*", "ui/**/*", "types/**/*", "next-env.d.ts"],
  "exclude": ["node_modules", ".next", "dist", "build"]
}
```

### 4. Update ESLint Config (15 minutes)
Update `eslint.config.js` to support TypeScript:

```javascript
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...typescriptEslint.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
];
```

### 5. Initial Commit
```bash
git add tsconfig.json eslint.config.js
git commit -m "chore: setup TypeScript configuration"
```

**Total Setup Time**: ~1 hour

---

## Detailed Phase Breakdown

### PHASE 1: TYPE DEFINITIONS (2-3 hours)

**Goal**: Create comprehensive type definitions that all other phases depend on

**Files to Create** (in `/types/` directory):

#### 1.1 types/index.ts (1 hour)
```typescript
// Core domain models
export type Profile = { ... }
export type Link = { ... }
export type City = { ... }
export type Token = { ... }
export type QuotePayload = { ... }
export type QuoteResponse = { ... }
export type RankedProfile = { ... }
// ~30 types total, ~200 lines
```

**Create by**: Day 1, 30 minutes in
**Validation**: Compiles with zero errors

#### 1.2 types/api.ts (30 min)
```typescript
// External API types
export type ApiErrorResponse = { ... }
export type FetchResult<T> = T | { error: string }
export type OneClickTokensResponse = { ... }
// ~10 types, ~80 lines
```

#### 1.3 types/contexts.ts (30 min)
```typescript
// Context types
export type SelectionContextType = { ... }
export type EditsContextType = { ... }
export type MessagingContextType = { ... }
export type SwapContextType = { ... }
// ~50 lines each, 4 contexts
```

#### 1.4 types/swap.ts (30 min)
```typescript
// Swap-specific complex types
export type SwapState = { ... }
export type TokenData = { ... }
export type QuoteParams = { ... }
// ~100 lines
```

#### 1.5 types/actions.ts (15 min)
```typescript
// Server action result types
export type ServerActionResult<T> = { ok: true; data: T } | { ok: false; error: string }
export type Result<T> = ...
// ~30 lines
```

#### 1.6 types/common.ts (15 min)
```typescript
// Shared utility types
export type ButtonCallback = (e?: React.MouseEvent<HTMLButtonElement>) => void
export type FormFieldProps = { ... }
// ~50 lines
```

**Checklist**:
- [ ] All 6 type files created
- [ ] No circular dependencies
- [ ] Compiles with `npx tsc --noEmit`
- [ ] Type coverage test (check no `any` types)

**Git Commit**:
```bash
git add types/
git commit -m "types: create foundational type definitions"
```

---

### PHASE 2: COMPONENT MIGRATION (15-20 hours)

**Goal**: Convert 62 JSX components to .tsx with proper prop interfaces
**Can Start**: After Phase 1 complete
**Parallel Work**: Yes, multiple engineers can work on different components

**Tier 1: Leaf Components** (1-2 hours, 12 files)
```
Start with these - no dependencies:
- HelpIcon (15 min)
- ProgressStep (15 min)
- ZcashAddressInput (30 min)
- StepContainer (15 min)
- ReferRankBadgeMulti (15 min)
- LetterGridModal (30 min)
- CopyButton (15 min)
- AlphabetSidebar (30 min)
- QrUriBlock (30 min)
- LinkInput (30 min)
- VerifiedBadge (15 min)
- HelpMessage (15 min)

Actions:
1. Rename .jsx → .tsx
2. Extract prop interface from JSDoc
3. Add return type annotation
4. Remove any JSDoc comments (types are now TypeScript)
5. Run: npx tsc --noEmit (should pass)
```

**Tier 2: Single-Dependency Components** (2-3 hours, 18 files)
```
Depends on Tier 1:
- ProfileField (20 min, depends on HelpIcon)
- ModalPortal (15 min)
- SocialLinkInput (20 min, depends on HelpIcon)
- [15 more files] (150 min total)

Actions:
1. Same as Tier 1
2. Import from converted Tier 1 components
3. Type context usage (useSelection(), etc.)
4. Type callback props with specific signatures
```

**Tier 3: Complex Composed** (8-10 hours, 12 files)
```
Depends on Tier 1 & 2:
- ProfileCard (2-3 hours, 8 child imports, flip animation)
- ProfileEditor (2-3 hours, multiple forms, validation)
- AmountAndWallet (2 hours, 60+ polymorphic props)
- AddUserForm (2 hours, multi-step form)
- ProfileVerification (1.5 hours)
- MemoComposer (1.5 hours)
- [6 more] (150 min)

Actions:
1. Create separate interfaces for polymorphic variants
2. Use discriminated unions where needed
3. Type all callbacks with explicit signatures
4. Component composition with proper children typing
5. Test with `npm run build` after each component
```

**Validation**:
- [ ] All 62 components converted
- [ ] `npm run build` succeeds
- [ ] No `any` types (except where absolutely necessary)
- [ ] All components properly typed

**Git Commits**:
```bash
git add ui/
git commit -m "components: convert Tier 1 leaf components to TypeScript"
git commit -m "components: convert Tier 2 single-dependency components"
git commit -m "components: convert Tier 3 complex composed components"
```

---

### PHASE 3: LIBRARY UTILITIES (18-25 hours)

**Goal**: Convert 23 utility files and support 13 server actions
**Can Start**: After Phase 1 complete (parallel with Phase 2)
**Parallel Work**: Yes, organize by dependency

**Tier 1: No Dependencies** (4 hours, 4 files)
```
Start immediately:
- swapPayload.ts (2 hours) - BigInt arithmetic, validation
- addressValidation.ts (1.5 hours) - Blockchain validators
- tokenUtils.ts (30 min) - Token symbol parsing
- validateUrl.ts (1 hour) - URL validation rules

Actions:
1. Add function signatures and return types
2. Extract validation types
3. Create union types for results
4. Add discriminated unions for errors
```

**Tier 2: Supabase-Dependent** (6 hours, 7 files)
```
After supabase-server.ts created:
- supabase-server.ts (1 hour, PREREQUISITE)
- searchCities.ts (1 hour)
- searchProfiles.ts (1.5 hours, complex filtering)
- profileQueries.ts (1 hour)
- verifyLinkDb.ts (1.5 hours, fallback patterns)
- createProfile.ts (1 hour)
- confirmOtp.ts (1 hour)

Actions:
1. Type Supabase responses (may need manual inspection of actual data)
2. Type error handling
3. Create response type interfaces
```

**Tier 3: Transform Functions** (6 hours, 4 files)
```
Pure functions with complex logic:
- profileLinks.ts (2 hours) - Domain mapping, handle extraction
- profileUtils.ts (2 hours) - Conditional logic tree (5+ branches)
- usernameNormalizer.ts (1 hour) - Social handle normalization
- zcashUtils.ts (1 hour) - Address validation, memo encoding

Actions:
1. Create discriminated unions for polymorphic returns
2. Use `as const` for domain mappings
3. Type transformation pipeline clearly
4. Add JSDoc for complex functions
```

**Tier 4: External API Integration** (5-7 hours, 2 files) - COMPLEX
```
Highest complexity - prioritize experienced engineer:
- oneClick.ts (3-4 hours) ⭐ COMPLEX
  - Timeout handling with AbortController
  - Token filtering pipeline
  - Error extraction from multiple fields
  - Create types from actual API responses

- profileFetcher.ts (2-3 hours) ⭐ COMPLEX
  - Multi-stage profile lookup (4 stages)
  - Promise.all for 3 parallel ranking queries
  - Slug normalization and matching
  - Map-based rank merging

Actions:
1. Create branded types for each stage
2. Extract helper functions with clear signatures
3. Test with actual API responses
4. Add detailed comments for complex logic
```

**Tier 5: Additional** (2 hours, 2 files)
```
- fetchTokens.ts (1 hour) - Next.js unstable_cache wrapper
- getRateAction.ts (1 hour) - Provider fallback loop with custom parsers
```

**Validation**:
- [ ] All 23 utility files converted
- [ ] `npx tsc --noEmit` passes
- [ ] All server actions can see typed utility imports
- [ ] Error handling properly typed

**Git Commits**:
```bash
git commit -m "lib: convert Tier 1 utilities (no dependencies)"
git commit -m "lib: convert Tier 2 utilities (Supabase)"
git commit -m "lib: convert Tier 3 utilities (transforms)"
git commit -m "lib: convert Tier 4 utilities (external APIs) - COMPLEX"
```

---

### PHASE 4: SERVER ACTIONS (10-15 hours)

**Goal**: Convert 13 server actions with proper async/Promise typing
**Depends On**: Phase 3 (library utilities)
**Can Start**: After Phase 3 is 80% done

**Group 1: Simple Wrappers** (3 hours, 7 files)
```
Single utility call, straightforward:
- confirmOtpAction.ts (30 min)
- updateLinkVerificationAction.ts (30 min)
- checkAddressTakenAction.ts (30 min)
- checkUsernameExistsAction.ts (30 min)
- checkUsernameIsVerifiedAction.ts (30 min)
- getProfileLinksAction.ts (30 min)
- getProfileLinksBatchAction.ts (1 hour, data grouping)

Pattern:
export async function action(params: T): Promise<Result<U>> {
  try {
    const result = await utility(params);
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: message };
  }
}
```

**Group 2: Search Operations** (2 hours, 2 files)
```
- searchCitiesAction.ts (1 hour)
- searchProfilesAction.ts (1 hour, 2 functions)

Pattern: Same as Group 1
Challenge: Type array results, handle empty results
```

**Group 3: Profile Creation** (2 hours, 1 file)
```
- createProfileAction.ts (2 hours)
  - Multiple exported functions (5 functions in one file)
  - Combined validation + inserts
  - Sequential await chains

Pattern: Each function wrapped in separate try-catch
Challenge: Multiple functions, error aggregation
```

**Group 4: Complex with Rankings** (3 hours, 1 file) - COMPLEX
```
- getNsProfilesAction.ts (3 hours) ⭐ COMPLEX

Challenges:
1. Promise.all typing for 3 parallel queries
2. Pagination loop with accumulation
3. Map-based enrichment
4. Type coercion (String(id))

Solution:
type RankingResult = { data: RankingRow[] | null; error: Error | null }
const [alltime, weekly, monthly]: [RankingResult, RankingResult, RankingResult] =
  await Promise.all([...])
```

**Group 5: Swap Operations** (4-6 hours, 3 files) - COMPLEX
```
- quoteAction.ts (2-3 hours) ⭐ COMPLEX
  - 4-stage async chain
  - Error handling at each stage with retryable flag
  - Response parsing and formatting

- confirmAction.ts (2-3 hours) ⭐ COMPLEX
  - Similar to quoteAction
  - Additional payload building

- depositAction.ts (1 hour)
  - Simple API call wrapper

- fetchTokens.ts (already done in Phase 3)
- getRateAction.ts (already done in Phase 3)

Challenges:
1. Type Promise chains clearly
2. Discriminated unions for retryable errors
3. API response shape inference
4. Format display data correctly

Solution:
Use sequential await with type narrowing at each stage
Create intermediate types for each response shape
```

**Validation**:
- [ ] All 13 server actions converted
- [ ] `npm run build` succeeds
- [ ] Error handling properly typed
- [ ] All return types are discriminated unions

**Git Commits**:
```bash
git commit -m "actions: convert Group 1-2 simple server actions"
git commit -m "actions: convert Group 3-4 complex server actions"
git commit -m "actions: convert Group 5 swap operations - COMPLEX"
```

---

### PHASE 5: PAGES & API ROUTES (8-12 hours)

**Goal**: Convert 2 API routes, 6 pages, 3 layouts to TypeScript
**Depends On**: Phase 1 (types), Phase 3 (lib utilities)
**Can Start**: After Phase 1 complete (parallel with Phases 2-4)

**API Routes** (2 hours, 2 files)
```
- app/api/search/route.ts (1 hour)
  - Type NextRequest/NextResponse
  - Validate query parameters
  - Call typed server actions
  - Return typed JSON responses

- app/api/swap/status/route.ts (1 hour)
  - Similar pattern
  - Handle missing required params
  - External API call error handling
```

**Layouts** (1 hour, 3 files)
```
- app/layout.tsx (15 min)
  - Add Metadata export
  - Type children prop

- app/[slug]/layout.tsx (15 min)
  - Type children + params props
  - Wrap in Providers component

- app/ns/layout.tsx (optional, 15 min)
```

**Server Pages** (6 hours, 5 files)
```
- app/page.tsx (1.5 hours)
  - Type Metadata export
  - Async function with typed return
  - Parallel data fetching with Promise.all
  - Pass initial data to client component

- app/[slug]/page.tsx (2 hours) ⭐ CRITICAL
  - Type params as Promise<T> (Next.js 15+ pattern)
  - Await params before using
  - generateMetadata() with async params
  - Optional generateStaticParams()
  - Use notFound() for missing resources

- app/ns/page.tsx (1 hour)
  - export const dynamic = "force-dynamic"
  - Fetch data, pass to client component

- app/privacy/page.tsx (30 min)
  - Static content

- app/terms/page.tsx (30 min)
  - Static content

Critical Pattern:
interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params // Must await!
}
```

**Client Pages** (4 hours, 4 components, NOT pages but top-level components)
```
Convert client components that are used as page content:

- app/HomePage.tsx (1.5 hours)
  - Type all props from server page
  - useState for animations
  - useRouter for navigation
  - Framer Motion component prop typing

- app/swap/page.tsx (1.5 hours)
  - useRouter, useSearchParams (Next.js hooks)
  - Complex polling logic
  - Sub-component typing (SwapStatusForm, TokenIcon, etc.)

- app/[slug]/ProfilePage.tsx (1 hour)
  - Uses multiple contexts
  - Type all context hooks
  - Props from server page

- app/ns/DirectoryNS.tsx (1.5 hours)
  - Largest client component (437 lines)
  - Convert incrementally
  - Type custom hooks usage
```

**Validation**:
- [ ] All API routes return typed responses
- [ ] All pages compile with async params
- [ ] Metadata properly typed
- [ ] `npm run build` succeeds
- [ ] All dynamic routes work

**Git Commits**:
```bash
git commit -m "app: convert API routes to TypeScript"
git commit -m "app: convert pages and layouts to TypeScript"
git commit -m "app: convert client page components to TypeScript"
```

---

### PHASE 6: CONTEXT PROVIDERS & HOOKS (8-10 hours)

**Goal**: Convert 4 context providers and 8 custom hooks
**Depends On**: Phase 2 (components use providers)
**Can Start**: After Phase 2 is mostly done

**Providers** (5-6 hours, 4 context files + 1 composition file)
```
- selection-provider.tsx (30 min)
  - Simplest provider
  - Boolean state
  - Export typed useSelection() hook

- edits-provider.tsx (1 hour)
  - Record<string, any> state
  - useCallback for setPendingEdits
  - Export typed useEdits() hook

- messaging-provider.tsx (1.5 hours)
  - Dual-mode state (draft/verify)
  - Multiple state setters
  - Export typed useMessaging() hook

- swap-provider.tsx (3-4 hours) ⭐ COMPLEX
  - 10+ state fields
  - Multiple async actions
  - Computed properties (selectedOriginToken, originSymbol)
  - Complex state updates
  - Export typed useSwap() hook

  Challenge: Typing complex context value with actions
  Solution: Create explicit interface with all fields/methods

- providers.tsx (15 min)
  - Compose all 4 providers
  - Type children prop

Pattern for each provider:
```typescript
"use client"

interface ContextType { ... }
const Context = createContext<ContextType | undefined>(undefined)

export function Provider({ children }: { children: ReactNode }) { ... }

export function useContext(): ContextType {
  const ctx = useContext(Context)
  if (!ctx) throw new Error("...")
  return ctx
}
```

Additional providers in app/ns/ (duplicate pattern, 1 hour):
- ns-selection-provider.tsx
- ns-edits-provider.tsx
- ns-messaging-provider.tsx
- ns-swap-provider.tsx
- ns-providers.tsx
```

**Custom Hooks** (3-4 hours, 8 hooks in various locations)
```
- useVerificationPolling.ts (1.5 hours)
  - useEffect with polling loop
  - Timeout handling
  - Type return object with status/isPolling/error

- useNsDirectory.ts (1 hour)
  - useEffect for batch data fetching
  - useState for results
  - Type custom hook return type

- useProfileModal.ts (1 hour)
  - Modal state management
  - useState
  - Callbacks

- useNsFilters.ts (1 hour)
  - Filter state
  - Search query state
  - Callbacks

- useNsCounts.ts (1 hour)
  - Computed counts
  - useMemo for optimization

- useFlightPaths.ts (1 hour)
  - Animation path calculations
  - Type number array returns

- useProfileEvents.ts (1 hour)
  - Event tracking
  - useCallback

- useEmojiAutocomplete.ts (1 hour)
  - Emoji suggestion lookup
  - Textarea reference handling

Pattern:
```typescript
interface HookReturnType {
  data: T[]
  isLoading: boolean
  error?: string
  callback: (x: Y) => void
}

export function useHook(): HookReturnType {
  const [data, setData] = useState<T[]>([])
  // ... hook implementation
  return { data, isLoading, error, callback }
}
```

Validation:
- [ ] All providers have typed useHook() exports
- [ ] All custom hooks have explicit return types
- [ ] `npm run dev` starts without type warnings
- [ ] All context usage properly typed
```

**Validation**:
- [ ] All 4 providers converted + typed hooks
- [ ] All 8 custom hooks converted
- [ ] Context hooks can't be called outside providers (runtime check)
- [ ] `npm run build` succeeds

**Git Commits**:
```bash
git commit -m "providers: convert context providers to TypeScript with typed hooks"
git commit -m "hooks: convert custom hooks to TypeScript"
```

---

### PHASE 7: STRICT MODE & POLISH (4-6 hours)

**Goal**: Enable strict TypeScript checking and fix remaining issues
**Depends On**: All previous phases

**7.1 Enable Strict Mode** (1 hour)
```bash
# In tsconfig.json, ensure these are enabled:
{
  "compilerOptions": {
    "strict": true,  // Enables all strict mode options
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}

# Run type checker
npx tsc --noEmit

# Fix any strict mode errors
# Common issues:
# - Implicit any types → add explicit type annotations
# - Unused variables → remove or prefix with _
# - Missing return types → add explicit type
# - Implicit undefined → use optional parameters or defaults
```

**7.2 Type Checking Full Build** (1-2 hours)
```bash
# Do a full build with type checking
npm run build

# Fix any remaining errors:
# - Missing prop types on components
# - Implicit any on utility functions
# - Type mismatches in API responses
# - Callback signature mismatches

# Common fixes:
# 1. Add explicit type: `: Type`
# 2. Use `as const` for literals
# 3. Create narrower types
# 4. Use Omit<T, K> for partial types
# 5. Use Partial<T> for optional fields
```

**7.3 ESLint TypeScript Rules** (1 hour)
```bash
# Ensure eslint.config.js has TypeScript rules
# Run linter
npm run lint

# Fix TypeScript-specific lint issues:
# - Prefer type over interface (or vice versa)
# - No unused type parameters
# - Proper use of void vs Promise<void>
# - Async function return types explicit
```

**7.4 Manual Type Audits** (1-2 hours)
```
Review high-risk files:
- [ ] lib/swap/oneClick.ts - API response typing
- [ ] lib/profile/profileFetcher.ts - Promise.all typing
- [ ] lib/swap/swapPayload.ts - BigInt handling
- [ ] app/[slug]/providers/swap-provider.tsx - Complex context
- [ ] app/[slug]/page.tsx - Async params pattern

For each, verify:
- [ ] No `any` types (except where unavoidable)
- [ ] All error cases typed
- [ ] Return types explicitly specified
- [ ] Generic types properly constrained
```

**7.5 Documentation** (30 min)
```
Create documentation:
- MIGRATION.md (how new code should use types)
- TYPE_PATTERNS.md (patterns for new code)
- CONTEXT_GUIDE.md (how to use context providers)

Add to code comments:
- Complex type definitions (why they're shaped this way)
- Generic constraints (why T extends X)
- Breaking patterns (why something is done differently)
```

**Validation**:
- [ ] `npm run build` - Zero errors
- [ ] `npm run lint` - Zero errors
- [ ] `npx tsc --noEmit` - Zero errors
- [ ] `npm run dev` - Zero type warnings
- [ ] Type coverage >95%

**Git Commits**:
```bash
git commit -m "chore: enable strict TypeScript mode"
git commit -m "chore: fix strict mode type errors"
git commit -m "docs: add TypeScript migration documentation"
```

---

## Parallel Work Streams

Three independent streams can work simultaneously after Phase 1 (types):

```
Day 1-2: Phase 0 + 1
├─ Setup (TypeScript install, tsconfig)
├─ Type definitions (types/*.ts)
│
Day 3+: Three Parallel Streams
├─→ Stream A: Components (Phase 2, 15-20h)
│   ├─ Tier 1 leaf components (1-2h)
│   ├─ Tier 2 single-dep (2-3h)
│   └─ Tier 3 complex (8-10h)
│   └─→ Then: Providers (Phase 6, 4-5h)
│
├─→ Stream B: Lib Utilities (Phase 3, 18-25h)
│   ├─ Tier 1 no-deps (4h) - start immediately
│   ├─ Tier 2 supabase (6h)
│   ├─ Tier 3 transforms (6h)
│   └─ Tier 4-5 APIs (5-7h)
│   └─→ Then: Server Actions (Phase 4, 10-15h)
│
└─→ Stream C: Pages/API (Phase 5, 8-12h)
    ├─ API routes (2h)
    ├─ Layouts (1h)
    ├─ Server pages (6h)
    └─ Client components (4h)

Final: Phase 7 (Polish, 4-6h) - All streams converge
└─→ Strict mode, type audits, documentation
```

### Recommended Team Allocation

**Option 1: Solo Engineer**
- Do sequentially: Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7
- Estimated: 2.5-3 weeks
- Risk: Slow progress on high-complexity items

**Option 2: 2 Engineers**
- Engineer A: Phases 2 + 6 (Components + Providers, 23-30h)
- Engineer B: Phases 3 + 4 + 5 (Lib + Actions + Pages, 36-52h)
- Sync after Phase 1: Have Engineer B start Phase 3 while A does Phase 2
- Estimated: 1.5-2 weeks

**Option 3: 3 Engineers**
- Engineer A: Phase 2 (Components, 15-20h) + Phase 6 (Providers, 4-5h) = 19-25h
- Engineer B: Phase 3 (Lib, 18-25h) → Phase 4 (Actions, 10-15h) = 28-40h
- Engineer C: Phase 5 (Pages, 8-12h) → Help Phase 7 polish = 12-18h
- Estimated: 1-1.5 weeks

---

## Timeline & Milestones

### Week 1
```
Day 1-2:
└─ Phase 0: Setup (3-4h)
  └─ Milestone: tsconfig.json created, tests pass
└─ Phase 1: Type Definitions (2-3h)
  └─ Milestone: All type files created, zero circular deps

Day 3-5:
└─ Phase 2: Components Tier 1-2 (3-5h)
  └─ Milestone: 30 leaf+single-dep components done
└─ Phase 3: Lib Tier 1-2 (10-12h, parallel)
  └─ Milestone: 11 utilities done, Supabase types working

Weekend/Spare:
└─ Phase 5: API Routes (2h, parallel)
  └─ Milestone: 2 API routes typed and working
```

### Week 2
```
Day 1-3:
└─ Phase 2: Components Tier 3 (8-10h)
  └─ Milestone: All 62 components converted
└─ Phase 3: Lib Tier 3-4 (8-13h, parallel)
  └─ Milestone: All 23 utilities converted

Day 4-5:
└─ Phase 4: Server Actions (10-15h, depends on Phase 3)
  └─ Milestone: All 13 server actions converted
└─ Phase 5: Pages/Layouts (8-12h, parallel)
  └─ Milestone: All 8 pages/layouts converted

Weekend/Spare:
└─ Phase 6: Providers (5-6h)
  └─ Milestone: 4 providers + 8 hooks converted
```

### Week 3
```
Day 1-2:
└─ Phase 6: Complete Hooks (2-4h)
  └─ Milestone: All 8 custom hooks converted
└─ Phase 7: Polish (4-6h)
  └─ Milestone: Strict mode enabled, build passes

Day 3:
└─ Manual Testing (4-6h)
  └─ Milestone: All routes tested, zero warnings
└─ Final Cleanup (2-3h)
  └─ Milestone: Build verified, PRdocs added

Day 4-5:
└─ Code Review & Merge
  └─ Milestone: PR reviewed, merged to main
```

**Total**: 2.5-3 weeks solo, 1.5-2 weeks with team

---

## Risk Mitigation

### Risk 1: Complex Async Patterns
**Impact**: High (quoteAction, getNsProfilesAction, profileFetcher)
**Mitigation**:
- Extract helper functions with clear signatures
- Test Promise.all typing separately
- Create tuple types for parallel results
- Add detailed comments

**Owner**: Senior engineer or experienced async specialist

### Risk 2: Supabase Type Inference
**Impact**: Medium (unknown response shapes)
**Mitigation**:
- Inspect actual API responses from Supabase
- Create interfaces from real data
- Use `as const` for known shapes
- Test each action with real database

**Owner**: Engineer familiar with database

### Risk 3: Polymorphic Components
**Impact**: Medium (ProfileCard, AmountAndWallet)
**Mitigation**:
- Use discriminated unions
- Create separate interfaces for variants
- Test each variant independently
- Document prop combinations

**Owner**: Component-focused engineer

### Risk 4: No Automated Tests
**Impact**: High (bugs won't be caught automatically)
**Mitigation**:
- Manual testing of each phase
- Test all routes in browser
- Test all API endpoints
- Test context provider state changes
- Create manual test checklist

**Owner**: All engineers + QA

### Risk 5: Type Coverage Gaps
**Impact**: Medium (hidden bugs post-migration)
**Mitigation**:
- Run `npx tsc --noEmit` frequently
- Enable strict mode from the start
- Code review for type safety
- Use `no-implicit-any` rule
- Aim for >95% type coverage

**Owner**: Lead engineer

### Risk 6: Breaking Changes
**Impact**: Low (JavaScript behavior preserved)
**Mitigation**:
- Keep same logic when converting
- Don't refactor during migration
- Test behavior matches original
- Revert problematic files if needed
- Each phase independently reviewable

**Owner**: All engineers

---

## Daily Standup Template

Use this template for team syncs (if applicable):

```markdown
## Daily Standup - [Date]

### Completed Yesterday
- [ ] Phase X: [Task Name]
- [ ] Phase Y: [Task Name]
- Blockers: None / [Description]

### Today's Goals
- [ ] Phase X: [Task Name]
- [ ] Phase Y: [Task Name]

### Blockers/Help Needed
- [ ] [Issue]: [Description]
- [ ] [Issue]: [Description]

### Type Coverage
- Current: X%
- Target: >95%

### Build Status
- `npm run build`: ✅ Pass / ❌ Fail (X errors)
- `npm run dev`: ✅ Pass / ❌ Fail (X warnings)
- Type check: ✅ Pass / ❌ Fail (X errors)
```

---

## Success Criteria

### Phase-by-Phase Success

| Phase | Success Criteria |
|-------|------------------|
| 0 | tsconfig.json created, TypeScript installs, ESLint updated |
| 1 | All 6 type files created, zero circular deps, compiles |
| 2 | All 62 components .tsx, npm run build succeeds |
| 3 | All 23 utils .ts, no `any` types, tsc passes |
| 4 | All 13 actions .ts, returns typed discriminated unions |
| 5 | All pages/API .ts, async params awaited, metadata typed |
| 6 | All providers/hooks converted, useContext() works, tests |
| 7 | Strict mode ✓, tsc ✓, build ✓, dev ✓, no warnings |

### Overall Success Criteria

- ✅ **Build**: `npm run build` completes, zero type errors
- ✅ **Dev Server**: `npm run dev` runs, zero type warnings
- ✅ **Type Check**: `npx tsc --noEmit` passes
- ✅ **Lint**: `npm run lint` passes (TypeScript rules)
- ✅ **File Count**: All 116 files converted (0 .js/.jsx remaining)
- ✅ **Type Coverage**: >95% (minimal `any` types)
- ✅ **Tests**: Manual test suite passes
  - [ ] Home page loads
  - [ ] Profile navigation works
  - [ ] Search functionality works
  - [ ] Swap workflow works
  - [ ] Context state persists
  - [ ] API endpoints respond
  - [ ] NS Directory works
- ✅ **Strict Mode**: `"strict": true` enabled
- ✅ **Documentation**: Migration guide + type patterns doc created
- ✅ **Code Review**: All phases reviewed before merging
- ✅ **Git**: Clean commit history, logical commits per phase

---

## Final Checklist

Before merging to main:

- [ ] All files converted to .ts/.tsx
- [ ] `npm run build` succeeds (zero errors)
- [ ] `npm run dev` runs (zero warnings)
- [ ] `npx tsc --noEmit` passes (zero errors)
- [ ] `npm run lint` passes (zero errors)
- [ ] All routes tested in browser
- [ ] All API endpoints tested (curl/Postman)
- [ ] Strict mode enabled
- [ ] Type coverage >95%
- [ ] Migration documentation written
- [ ] Code review completed
- [ ] Team approved release
- [ ] Commit message follows conventions
- [ ] No merge conflicts

---

## Post-Migration

### Cleanup
- Remove `jsconfig.json` (no longer needed)
- Update any documentation referencing JavaScript
- Remove any JavaScript type stubs

### Team Training
- Share type patterns documentation
- Walkthrough of context providers
- Best practices for async/Promise typing

### Monitoring
- Watch for type errors in CI/CD
- Monitor build times (TypeScript adds ~10-30s)
- Collect team feedback on the migration

### Future Improvements
- Add E2E tests (now with type safety)
- Consider Zod for runtime validation
- Add pre-commit hooks for type checking

---

**Total Estimated Time**: 68-95 hours
**Ready to Execute**: Yes, all analysis complete
**Confidence Level**: High
**Risk Level**: Medium (manageable with plan)

---

Generated: 2026-02-08
Related Documents:
- 00-MIGRATION-OVERVIEW.md (executive summary)
- 01-COMPONENT-ANALYSIS.md (detailed component info)
- 02-LIBRARY-ANALYSIS.md (detailed lib info)
- 03-APP-DIRECTORY-ANALYSIS.md (detailed app info)
- 05-MIGRATION-CHECKLIST.md (actionable checklist)
