# /lib/thread - Discussion Board Logic

## Purpose
Server actions and types for the OTP-verified discussion board.
Users post messages by proving identity via Zcash transactions.

## Key Files

### types.ts
```typescript
interface ThreadMessage {
  id: string;
  boardId: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  content: string;
  createdAt: string;
  verified: boolean;
}

interface Board {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  messageCount: number;
  createdAt: string;
}

interface ThreadStore {
  currentBoard: Board | null;
  messages: ThreadMessage[];
  composerContent: string;
}
```

### actions.ts
Server actions (partially implemented):
```typescript
'use server'

// Fetch available boards
export async function fetchBoards(): Promise<Board[]>

// Post verified message
export async function postMessage(input: {
  boardId: string;
  content: string;
  otp: string;
}): Promise<{ success: boolean; message?: ThreadMessage }>

// Create new board
export async function createBoard(input: {
  name: string;
  description?: string;
}): Promise<{ success: boolean; board?: Board }>
```

### utils.ts
Helper functions for thread operations.

## Verification Flow
1. User writes message
2. Generates OTP
3. Sends Zcash tx with OTP in memo
4. Server confirms OTP
5. Message posted with verified badge

## Anti-Spam Mechanism
- Each post requires on-chain proof
- Small fee (~0.0001 ZEC) per message
- Ties posts to verified profiles
- Rate limits per user

## Database Tables
```sql
zcasher_boards (
  id, name, description, created_at
)

zcasher_thread_messages (
  id, board_id, author_id, content,
  verified, created_at
)
```

## Status: Partially Implemented
The actions file has TODO comments - some features pending:
- Board creation flow
- Message editing/deletion
- Moderation tools

## Testing Harness
- Mock database responses
- Test message posting flow
- Verify OTP integration
- Test board switching

## UI Integration
Components in `/ui/thread/` consume this logic.
State managed by Zustand store in `/lib/stores/thread.ts`.
