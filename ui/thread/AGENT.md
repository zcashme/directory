# /ui/thread - Discussion Board UI [WIP]

## Purpose
React components for the discussion board at thread.zcash.me.
**Status: UI is fully built and styled, but the backend is stubbed. No real data flows through yet.**

## What the User Would See

### Desktop Layout
A sidebar listing boards (with active highlight and "Create Board" button) next to
a main area with: board header (name, description, member count), scrollable message
feed with infinite scroll, and a message composer at the bottom.

### Mobile Layout
The sidebar collapses into a dropdown board selector. Same main content area.

### Message Card
Avatar (image or gradient fallback with first letter), username, verified badge,
relative timestamp, and message content.

### Composer
Auto-expanding textarea with emoji autocomplete (`:` trigger), 512-byte limit with
counter, Cmd+Enter to submit, and a clear button.

### Create Board
Modal with name input (2-50 chars) and optional description (max 200 chars),
character counters on both fields.

## What's Not Wired Yet
- Infinite scroll pagination (`hasMoreMessages` is hardcoded to `true`)
- `verified` badge is always `false` (OTP verification not connected)
- Avatar `profile_image_url` is never populated
- All data comes from stubbed server actions returning empty arrays

## File -> Feature Map

| File | Feature |
|------|---------|
| `ThreadBoard.tsx` | Top-level orchestrator: board selection, message display, responsive layout |
| `ThreadFeed.tsx` | Scrollable message list with Intersection Observer infinite scroll + loading skeletons |
| `ThreadCard.tsx` | Individual message: avatar, username, verified badge, timestamp, content |
| `ThreadComposer.tsx` | Message input with emoji autocomplete (`useEmojiAutocomplete`), byte counter, Cmd+Enter submit |
| `BoardHeader.tsx` | Board name, description, member count, creation date |
| `BoardSelector.tsx` | Mobile-only dropdown for switching boards |
| `SidebarNav.tsx` | Desktop sidebar: board list with active state, "Create Board" button, loading skeleton |
| `CreateBoardModal.tsx` | Modal form for new boards with name/description validation |

## See Also
- `lib/thread/AGENT.md` — stubbed server actions and types
- `ui/messaging/AGENT.md` — emoji autocomplete hook used by ThreadComposer
