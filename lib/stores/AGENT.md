# /lib/stores - Zustand State Management

## Purpose
Client-side state using Zustand. Lightweight stores for UI state that doesn't
belong in server components or React Query cache.

## Stores

### swap.ts - Swap State
```typescript
interface SwapStore {
  // Token selection
  fromToken: Token | null;
  toToken: Token | null;
  setFromToken: (token: Token) => void;
  setToToken: (token: Token) => void;

  // Amounts
  fromAmount: string;
  toAmount: string;
  setFromAmount: (amount: string) => void;

  // Quote
  quote: SwapQuote | null;
  setQuote: (quote: SwapQuote) => void;

  // Settings
  slippage: number;
  setSlippage: (slippage: number) => void;

  // Deposit
  deposit: SwapDeposit | null;
  setDeposit: (deposit: SwapDeposit) => void;

  // Reset
  reset: () => void;
}
```

### messaging.ts - Memo Composer State
```typescript
interface MessagingStore {
  memo: string;
  setMemo: (memo: string) => void;

  // OTP verification polling
  isPolling: boolean;
  setPolling: (polling: boolean) => void;
  pollInterval: number;
}
```

### thread.ts - Discussion Board State
```typescript
interface ThreadStore {
  currentBoard: Board | null;
  setCurrentBoard: (board: Board) => void;

  messages: ThreadMessage[];
  addMessage: (msg: ThreadMessage) => void;

  composerContent: string;
  setComposerContent: (content: string) => void;
}
```

### edits.ts - Profile Edit Tracking
Tracks pending edits before blockchain confirmation.

## Usage Pattern
```typescript
'use client';
import { useSwapStore } from '@/lib/stores/swap';

function SwapComponent() {
  const { fromToken, setFromToken, quote } = useSwapStore();
  // ...
}
```

## Testing Harness
Zustand stores are easily testable:
```typescript
import { useSwapStore } from '@/lib/stores/swap';

// Reset before each test
beforeEach(() => useSwapStore.getState().reset());

test('sets token', () => {
  useSwapStore.getState().setFromToken(mockToken);
  expect(useSwapStore.getState().fromToken).toEqual(mockToken);
});
```

## When to Use Stores vs React Query
- **Stores**: UI state, form values, selections, local preferences
- **React Query**: Server data, cached responses, background updates
