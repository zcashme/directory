# /lib/swap - Cryptocurrency Swap

## Purpose
Integration with Defuse Protocol's OneClick SDK for cross-chain swaps.
Allows users to receive payments in any token, converted to ZEC.

## Key Files

### types.ts
```typescript
interface Token {
  symbol: string;
  name: string;
  decimals: number;
  address?: string;      // contract address for ERC20
  chainId: string;
}

interface SwapQuote {
  fromToken: Token;
  toToken: Token;        // Usually ZEC
  fromAmount: string;
  toAmount: string;
  rate: string;
  slippage: number;
  expiresAt: number;
}

interface SwapDeposit {
  address: string;       // Deposit address (chain-specific)
  memo?: string;         // Required for some chains
  expiresAt: number;
}
```

### oneClick.ts
OneClick SDK wrapper:
```typescript
import { OneClickClient } from '@anthropic/defuse-one-click-sdk';

// Initialize client
const client = new OneClickClient({ apiKey: ONECLICK_API_KEY });

// Get supported tokens
await client.getTokens();

// Get quote
await client.getQuote({ from, to, amount });

// Create deposit address
await client.createDeposit({ quoteId, destinationAddress });
```

### utils.ts
Helper functions for swap calculations and formatting.

## Zcash as Destination
Primary use case: receive any crypto → convert to ZEC
- User's Zcash address is the final destination
- Supports unified addresses for privacy
- OneClick handles cross-chain bridging

## Environment Variables
```
ONECLICK_API_KEY - Server-side Defuse API key
```

## Testing Harness
- Mock OneClick SDK responses
- Test quote calculations locally
- Use testnet for integration tests

## State Management
Swap state lives in `/lib/stores/swap.ts` (Zustand):
- Selected tokens
- Amounts
- Current quote
- Deposit info
- Slippage tolerance

## Error Handling
- Quote expiration (refresh needed)
- Insufficient liquidity
- Network errors
- Invalid addresses
