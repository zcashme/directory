# /ui/thread - Discussion Board UI

## Purpose
Components for Zcash-verified discussion boards. Users post messages
by proving identity via blockchain transaction.

## Components

| Component | File | Purpose |
|-----------|------|---------|
| `ThreadBoard` | ThreadBoard.tsx | Main board container |
| `ThreadFeed` | ThreadFeed.tsx | Scrollable message list |
| `ThreadCard` | ThreadCard.tsx | Individual message card |
| `ThreadComposer` | ThreadComposer.tsx | Message input form |
| `ZcashVerificationComposer` | ZcashVerificationComposer.tsx | OTP-verified composer |
| `BoardHeader` | BoardHeader.tsx | Board title and info |
| `BoardSelector` | BoardSelector.tsx | Board selection dropdown |
| `SidebarNav` | SidebarNav.tsx | Navigation sidebar |
| `CreateBoardModal` | CreateBoardModal.tsx | New board creation |

## Board Structure

```
┌─────────────────────────────────────────────────────┐
│ ┌──────────┐ ┌────────────────────────────────────┐ │
│ │ Boards   │ │  General Discussion                │ │
│ │ ───────  │ │  ─────────────────                  │ │
│ │ General  │ │  ┌──────────────────────────────┐   │ │
│ │ Tech     │ │  │ alice.zcash.me        2h ago│   │ │
│ │ Trading  │ │  │ Just sent my first shielded │   │ │
│ │          │ │  │ transaction!              ✓ │   │ │
│ │ [+]      │ │  └──────────────────────────────┘   │ │
│ │          │ │  ┌──────────────────────────────┐   │ │
│ │          │ │  │ bob.zcash.me          5h ago│   │ │
│ │          │ │  │ Welcome to the community!   │   │ │
│ │          │ │  └──────────────────────────────┘   │ │
│ └──────────┘ │                                     │ │
│              │  ┌──────────────────────────────┐   │ │
│              │  │ Write a message...           │   │ │
│              │  │               [Verify & Post]│   │ │
│              │  └──────────────────────────────┘   │ │
│              └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Zcash Verification

### Verified Posting
Users must verify each post via Zcash transaction:
1. Write message
2. Generate OTP
3. Send small tx with OTP in memo
4. Message posted after confirmation

```tsx
<ZcashVerificationComposer
  onVerified={(message) => postMessage(message)}
/>
```

### Anti-Spam
- Each post requires on-chain proof
- Small fee (~0.0001 ZEC) per post
- Links posts to verified profiles

## State Management
Uses Zustand store at `/lib/stores/thread.ts`:
- Current board selection
- Message list
- Composer content

## Types
See `/lib/thread/types.ts`:
```typescript
interface ThreadMessage {
  id: string;
  boardId: string;
  authorId: string;
  content: string;
  createdAt: string;
  verified: boolean;
}
```

## Testing Harness
- Mock thread actions for unit tests
- Test message rendering
- Verify composer validation
- Test board switching
