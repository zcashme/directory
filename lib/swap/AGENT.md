# /lib/swap - Cross-Chain Swap Integration

## Purpose
Server-side integration with Defuse Protocol's 1Click SDK for cross-chain token swaps.
Users send any supported crypto and the recipient receives ZEC. Powers both the standalone
swap page (swap.zcash.me) and the payment composer on profile pages.

## What the User Experiences

### Getting a Quote
User selects a token (BTC, ETH, USDC, USDT, SOL) and enters an amount. The system
fetches a dry-run quote from the 1Click API showing the estimated ZEC the recipient
will receive, USD equivalents, and a minimum amount after slippage. Quotes expire
after ~60 seconds.

### Confirming a Swap
Once the user provides a valid refund address, the system auto-confirms the quote
(no manual button). This generates a deposit address and a blockchain-specific payment
URI (`bitcoin:`, `ethereum:`, or `solana:` scheme). The user scans the QR or copies
the address and sends the exact amount from their wallet.

### Checking Status
After sending, the user can check swap status. The system polls the 1Click API using
the deposit address and memo to track execution progress.

## Supported Tokens
ZEC (native chain only), BTC, ETH, USDC, USDT, SOL. Testnet and NEAR-bridged tokens
are filtered out. The app takes a fee via the "zcash-me.near" recipient (150 base units).

## File -> Feature Map

| File | Feature |
|------|---------|
| `oneClick.ts` | Server actions: `getSwapTokens()` (filtered token list), `getSwapQuote()` (dry-run quote), `confirmSwap()` (deposit address + payment URI), `getSwapStatus()` (execution polling) |
| `types.ts` | Interfaces: `Token`, `SwapQuoteData` (base + display layers), `SwapConfirmData` (deposit + URI), `SwapContextQuoteData` |
| `utils.ts` | `toBaseUnits()` / `baseUnitsToDecimal()` (BigInt math), `findToken()`, `getSwapUrl()`, `parseTokenSymbol()` |

## See Also
- `ui/swap/AGENT.md` — swap form components, QR display, auto-flow orchestration
