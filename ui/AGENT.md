# /ui - React Components

## Purpose
All reusable React components, organized by feature. Pages in `/app` compose these
components. Server actions and types come from `/lib`.

## Directory Overview

| Folder | Purpose | See |
|--------|---------|-----|
| `common/` | Design system: buttons, forms, modals, layout, feedback, tooltips | `ui/common/AGENT.md` |
| `profile/` | Profile card (3D flip), editor, avatar, badges, search dropdown, header, Maxi upgrade [WIP] | `ui/profile/AGENT.md` |
| `signup/` | 6-step signup modal (username, address, links, city, referrer, review) | `ui/signup/AGENT.md` |
| `verification/` | QR code display, OTP input, verification modal | `ui/verification/AGENT.md` |
| `links/` | OAuth social link authentication (X, GitHub, Discord, LinkedIn) | `ui/links/AGENT.md` |
| `swap/` | Swap composer with auto-flow, deposit display, slippage control | `ui/swap/AGENT.md` |
| `thread/` | Discussion board UI [WIP — backend stubbed] | `ui/thread/AGENT.md` |
| `messaging/` | Memo composer with 512-byte limit, emoji autocomplete | `ui/messaging/AGENT.md` |

## Conventions
- TailwindCSS 4 for styling, Framer Motion for animations
- `'use client'` only when component needs event handlers, hooks, or browser APIs
- Direct imports from subfolders (no barrel exports): `import Button from '@/ui/common/buttons/Button'`
- Visit `/design-system` to see all `ui/common` components rendered
