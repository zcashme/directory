# /ui - React Components

## Purpose
Reusable React components organized by feature domain. All UI presentation
lives here - pages in `/app` compose these components.

## Directory Structure

| Folder | Purpose |
|--------|---------|
| `/common` | Design system: buttons, forms, modals, layout |
| `/profile` | Profile cards, editors, avatars, badges |
| `/signup` | Profile creation form components |
| `/verification` | OTP input, QR codes, verification flows |
| `/swap` | Swap composer, token selection, quotes |
| `/thread` | Discussion board, message cards |
| `/messaging` | Memo composer with emoji support |
| `/social` | Social link verification UI |
| `/ns-directory` | Network School specific components |
| `/styles` | Shared style utilities |

## Component Conventions

### File Naming
- `ComponentName.tsx` - Main component
- `componentUtils.ts` - Helper functions
- `componentTypes.ts` - TypeScript interfaces
- `useComponentHook.ts` - Custom hooks

### Client vs Server Components
```typescript
// Server component (default)
export function ProfileCard({ profile }) { ... }

// Client component (when needed)
'use client';
export function InteractiveForm() { ... }
```

Use `'use client'` only when component needs:
- Event handlers (onClick, onChange)
- Hooks (useState, useEffect)
- Browser APIs

## Styling
- TailwindCSS 4 with utility classes
- No CSS modules or styled-components
- Framer Motion for animations

## Zcash UI Patterns
- QR codes use `zcash:` URI scheme
- Address inputs validate on blur
- Privacy warnings for transparent addresses
- Unified address (u1...) shown prominently

## Testing Harness
- Manual testing via `/app/design-system` route
- Components are stateless where possible
- Props-based API for easy snapshot testing

## Adding Components
1. Create in appropriate feature folder
2. Export from folder's `index.ts`
3. Use `/common` components for consistency
4. Add to design-system page if reusable
