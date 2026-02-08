# Lint Violations Fix Plan

## Status
- `npm run lint` (ESLint 9.39.2 + new flat, type‑checked config) currently fails with **874 problems** (511 errors, 363 warnings). The largest clusters are `@typescript-eslint/no-unsafe-*`, `no-floating-promises`, `no-misused-promises`, `prefer-nullish-coalescing`, `consistent-type-imports`, and `_unused-vars`/`@typescript-eslint/no-unused-vars`.
- The breaking rules only apply to TypeScript files because the flat config restricts to `**/*.{ts,tsx,cts,mts}`.

## Rule groups to tackle
1. **Unsafe operations** (`@typescript-eslint/no-unsafe-*`, `no-explicit-any`, `no-unsafe-argument`, `no-unsafe-member-access`, `no-unsafe-assignment`, `no-unsafe-return`): introduce proper types (interfaces, type guards, mapped DTOs) for all values currently typed as `any` or implicitly `unknown`. Prioritize high-frequency files like `app/[slug]/ProfilePage.tsx`, `ui/swap/SwapComposer.tsx`, `app/ns/DirectoryNS.tsx`, and the swap providers.
2. **Promise handling** (`no-floating-promises`, `no-misused-promises`, `require-await`): `await` asynchronous calls, add `.catch`/`void` wrappers, or adjust the expected return type (especially in `ui/verification/*`, `app/[slug]/providers/*`, `ui/swap/SwapComposer.tsx`). Group related usages for each component to avoid missing dependencies.
3. **Nullish/coercion safety** (`prefer-nullish-coalescing`): replace `||` with `??` where defaults are intended, especially around data properties (`ProfilePage.tsx`, `app/[slug]/providers`, `ui/verification/*`), and audit boolean expressions for falsy logic.
4. **Redundant unions & unused imports/vars** (`no-redundant-type-constituents`, `consistent-type-imports`, `no-unused-vars`/`@typescript-eslint/no-unused-vars`): simplify intersections/unions (e.g., `unknown | T`), switch to `import type`, and remove `_error`/`_err` leftovers. Files impacted: `app/[slug]/providers/types.ts`, API routes in `app/api/*/route.ts`, verification helpers.
5. **React/Hook maintenance** (`react-hooks/exhaustive-deps`): add missing dependencies or remove inline callback arrays (e.g., `swap-provider.tsx`), ensuring `useCallback` dependencies align with closures.

## Suggested fix steps
1. **Audit data flow** (ProfilePage, providers, DTOs): define or import typed responses (e.g., typed supabase response schema, `ProfileForMemo`, `Token` shapes). Replace `any`/`unknown` with those types or use type guards before accessing properties.
2. **Promise reshaping**: For every `async` function, `await` network calls or wrap with `void` when intentionally ignored; add `.catch` handlers or `await` inside `useEffect`/event handlers; update `handleGenerateQr`, OTP helpers, and swap-related callbacks to satisfy `require-await`, `no-floating-promises`, `no-misused-promises`.
3. **Null-safe defaults**: Search for `||` and evaluate if `??` applies; adjust fallback logic when `0` or `""` are valid values and add explicit truthiness checks when necessary.
4. **Type imports and unused symbols**: Convert `'NextRequest'` imports to `import type { NextRequest }` (or inline `type`), remove `_error`/`_err` or use `/* eslint-disable-next-line */` only where necessary after codifying reasoning.
5. **Refactor recursive components**: Where `any` flows from `DirectoryNS` and `SwapComposer`, break components into smaller well-typed hooks/helpers to limit surface area of `no-unsafe-*` violations.
6. **Run lint iteratively**: After each major batch of fixes (e.g., once `ProfilePage` is typed), re-run `npm run lint` to catch remaining errors, focusing the output on the next file cluster.

## Next actions
1. Tackle the `app/[slug]/ProfilePage.tsx`/providers errors (most numerous) by deriving types from the API layer; verify with targeted lint run using `npx eslint app/[slug]/ProfilePage.tsx`.
2. Clean up `ui/verification` suite to satisfy promise rules and nullish coalescing hints.
3. Finish with cross-cutting items: unused imports, hook dependencies, and remaining warnings (`prefer-nullish-coalescing`) across the codebase.

_Keep this plan updated as the remaining violations shrink: the command `npm run lint` should eventually run clean when no errors remain._ 

## Progress
- Added a dedicated `PendingEdits` type plus shared `FeedbackProps`, then wired them through `ProfilePage`, `ProfileCard`, `ProfileEditor`, and the edits context to eliminate the untyped `pendingEdits` hacks.
- Re-running `npm run lint` after the type tightening reduced the report to ~797 problems (449 errors) centered on the swap context, verification flows, API routes, and the large `DirectoryNS` component.
