# TypeScript Migration Overview

## Project: Zcash.me Directory
**Start Date**: 2026-02-08
**Estimated Duration**: 1.7-2.4 weeks (68-95 hours)
**Risk Level**: Medium
**No Automated Tests**: Manual testing required

---

## Executive Summary

This is a comprehensive JavaScript → TypeScript migration for a Next.js 16 application with 116 files across:
- **62 JSX components** in `/ui/` directory
- **23 utility files** and **13 server actions** in `/lib/` directory
- **8 pages/layouts**, **2 API routes**, **4 context providers** in `/app/` directory
- **~14K lines of code** total

### Key Metrics

| Metric | Value |
|--------|-------|
| Total Files | 116 (JS/JSX) |
| Component Files | 62 |
| Utility Files | 23 |
| Server Actions | 13 |
| Pages/Layouts | 8 |
| API Routes | 2 |
| Context Providers | 4 |
| Custom Hooks | 8 |
| Total LOC | ~14,000 |
| Estimated Effort | 68-95 hours |
| Parallel Work Possible | Yes (3 streams) |

---

## High-Level Plan

### Phase 1: Foundations (2-3 hours)
- [x] Install TypeScript dependencies
- [x] Generate `tsconfig.json` with strict mode
- [ ] Create type definition files (types/*.ts)

### Phase 2: Components (15-20 hours)
- 12 leaf components (no dependencies)
- 18 single-dependency components
- 12 complex composed components

### Phase 3: Library Utilities (18-25 hours)
- 4 simple utilities (no deps)
- 7 Supabase utilities
- 8 transform/domain utilities
- 4 external API integrations (complex)

### Phase 4: Server Actions (10-15 hours)
- 7 simple action wrappers
- 5 complex async operations

### Phase 5: Pages & API Routes (8-12 hours)
- 2 API routes
- 6 public pages
- 3 layouts
- Client components

### Phase 6: Context & Hooks (8-10 hours)
- 4 context providers
- 8 custom hooks

### Phase 7: Polish & Strict Mode (4-6 hours)
- Enable strict TypeScript checking
- Fix remaining type errors
- Build verification

---

## Critical Success Factors

1. **Create types early** - All other phases depend on Phase 1
2. **Manage dependencies** - Convert leaf components/utilities first
3. **Test incrementally** - Build after each phase
4. **Manual testing required** - No automated test suite exists
5. **Use discriminated unions** - For error handling patterns
6. **Document context types** - SwapProvider is most complex

---

## Team Structure Recommendation

### Option 1: Solo (4 weeks)
- 1 senior engineer
- Sequential phases
- Low coordination overhead

### Option 2: Parallel (1-2 weeks)
- **Stream 1**: Types → Components → Providers (1 engineer)
- **Stream 2**: Types → Lib utilities → Server actions (1 engineer)
- **Stream 3**: Types → Pages/API routes (1 engineer)
- **Sync point**: Phase 6 (providers) + Phase 7 (integration)

---

## Complexity Hotspots

| Hotspot | Files | Challenge | Mitigation |
|---------|-------|-----------|-----------|
| Complex Async | quoteAction, getNsProfilesAction, profileFetcher | Promise.all typing, multi-stage chains | Extract helpers, discriminated unions |
| Polymorphic Props | AmountAndWallet (60+ props), ProfileCard, ProfileEditor | Multiple shape variants | Separate interfaces, `as const` typing |
| Conditional Logic | getWarningConfig, profileUtils | 5+ different return types | Union types, helper functions |
| External APIs | oneClick.ts, getRateAction | Response shape inference | Create interfaces from actual responses |
| State Management | SwapProvider (10+ fields + actions) | Complex context state | Typed hooks, consider useReducer |
| Dynamic Routes | [slug] param handling | Promise<T> params in Next.js 15+ | Await params before usage |

---

## Parallel Work Streams

Three independent streams can happen after Phase 1 (Type Definitions):

```
Phase 1: Type Definitions (Critical Path - 2-3 hours)
│
├─→ Stream A: Components (15-20h)
│   ├─ Leaf components (1-2h)
│   ├─ Single-dependency (3-4h)
│   └─ Complex composed (8-10h)
│   └─→ Phase 6: Providers (4-6h, depends on Phase 2)
│
├─→ Stream B: Lib Utilities (18-25h)
│   ├─ Simple utilities (4h)
│   ├─ Supabase-dependent (6h)
│   ├─ Transform functions (6h)
│   └─ Complex APIs (5h)
│   └─→ Phase 4: Server Actions (10-15h, depends on Phase 3)
│
└─→ Stream C: Pages/API (8-12h)
    ├─ API routes (2h)
    ├─ Layouts (2h)
    ├─ Server pages (4h)
    └─ Client pages (4h)

Final: Phase 7: Polish & Verification (4-6h, all streams done)
```

**Recommended Team Allocation**: 2-3 engineers, parallel streams

---

## Key Decisions Made

### 1. Type-First Approach
- Create comprehensive type definitions in Phase 1
- Reuse across all 116 files
- Enables parallel work in streams

### 2. Dependency-Ordered Conversion
- Always convert dependencies before dependents
- Leaf components/utilities first
- Reduces build errors and rework

### 3. Discriminated Unions for Errors
- Replace `{ ok, error, data }` with `{ ok: true; data: T } | { ok: false; error: string }`
- Better type narrowing
- Enforces error handling

### 4. Strict Mode Enabled
- `strict: true` in tsconfig
- `noImplicitAny`, `noUnusedLocals`, etc.
- Production-ready type safety

### 5. No Breaking Changes
- All JavaScript behavior preserved
- Types added on top
- Can revert individual files if needed

---

## Risk Assessment

### Low Risk (70% of codebase)
- Utility functions with clear I/O
- Pure transform functions
- Simple components with defined props

### Medium Risk (20% of codebase)
- Async/await patterns (common but manageable)
- Context providers with multiple value types
- Components with callbacks

### High Risk (10% of codebase)
- Supabase type inference (dynamic shapes)
- OAuth provider polymorphism
- Complex Promise.all patterns
- SwapProvider state management

**Mitigation**: Start with low-risk items for quick wins, allocate experienced TypeScript engineer to high-risk items.

---

## Testing Strategy

Since no automated tests exist:

### Phase Testing
- Run `npm run build` after each phase
- Check `npm run dev` has zero type warnings
- Spot-check key functionality

### Manual Test Suite (after Phase 7)
- [ ] Home page loads
- [ ] Profile navigation works
- [ ] Profile search works
- [ ] Swap workflow completes
- [ ] Context state persists
- [ ] API endpoints respond
- [ ] NS Directory loads and paginates
- [ ] All routes are clickable

### Build Verification
- `npm run build` - zero errors
- `tsc --noEmit` - zero errors
- `npm run lint` - zero errors

---

## Success Criteria

- ✅ All 116 files converted to .ts/.tsx
- ✅ Build succeeds with zero type errors
- ✅ Dev server runs with zero type warnings
- ✅ Manual test suite passes
- ✅ Strict mode enabled
- ✅ Type coverage >95%
- ✅ Discriminated unions for all errors
- ✅ All components properly typed
- ✅ All server actions return typed results

---

## Quick Reference: File Locations

**Analysis Documents**:
- Component Analysis: `01-COMPONENT-ANALYSIS.md`
- Library Analysis: `02-LIBRARY-ANALYSIS.md`
- App Directory Analysis: `03-APP-DIRECTORY-ANALYSIS.md`
- Execution Plan: `04-META-PLAN.md`
- Checklist: `05-MIGRATION-CHECKLIST.md`

**Type Files to Create**:
- `types/index.ts` - Core models
- `types/api.ts` - External API types
- `types/contexts.ts` - Context types
- `types/swap.ts` - Swap types
- `types/actions.ts` - Server action types
- `types/common.ts` - Shared utilities

**Conversion Order**:
See `04-META-PLAN.md` for detailed phase-by-phase breakdown with time estimates.

---

## Next Steps

1. **Read all analysis documents** (30 min)
2. **Set up TypeScript** (Phase 0 - 3-4 hours)
3. **Create type definitions** (Phase 1 - 2-3 hours)
4. **Begin parallel streams** (Phases 2-5, 51-72 hours)
5. **Integrate & Polish** (Phases 6-7, 12-16 hours)
6. **Manual testing** (concurrent with each phase)

**Estimated Start to Finish**: 1-2 weeks with 2-3 engineers

---

## Contact Points for Questions

- **Component typing**: See `01-COMPONENT-ANALYSIS.md` - Sections 2-4
- **Async patterns**: See `02-LIBRARY-ANALYSIS.md` - Section 5-6
- **Next.js typing**: See `03-APP-DIRECTORY-ANALYSIS.md` - Sections 2-6
- **Execution details**: See `04-META-PLAN.md`
- **What to do next**: See `05-MIGRATION-CHECKLIST.md`

---

Generated: 2026-02-08
Codebase: Zcash.me Directory (Next.js 16, React 19)
