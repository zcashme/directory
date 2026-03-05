# /lib/thread - Discussion Board Logic [WIP]

## Purpose
Server actions and types for the discussion board at thread.zcash.me.
**Status: Stub — all server actions return placeholder data. No database integration yet.**

## What It Will Do
Users post messages to topic boards. Each post requires Zcash OTP verification
(send a transaction to prove identity). Messages show verified badges for authenticated
posts. Boards can be created by verified users.

## Current State
- Types are defined (`ThreadMessage`, `Board`)
- Server actions exist but all contain `TODO: Replace with actual API call`
- Validation is implemented (500-char message limit, 2-50 char board names)
- No database tables are queried or written to
- OTP verification is not connected

## File -> Feature Map

| File | Feature |
|------|---------|
| `actions.ts` | Stubbed server actions: `fetchBoardsAction()`, `fetchMessagesAction()`, `postMessageAction()`, `createBoardAction()` |
| `types.ts` | `ThreadMessage` (id, user_id, username, verified, content, board_id) and `Board` (id, name, description, creator_id, member_count) |
| `utils.ts` | `formatDistanceToNow()` — relative time labels ("just now", "2 hours ago", etc.) |

## See Also
- `ui/thread/AGENT.md` — UI components (fully built, awaiting backend integration)
