import type { Token } from "./types";

/** Base uses EIP-681 with its own chain ID, including ERC-20 transfer calls. */
export function buildBasePaymentUri(token: Token, address: string, amountBase: string): string {
  if (token.symbol.toUpperCase() === "ETH") {
    return `ethereum:${address}@8453?value=${amountBase}`;
  }
  if (token.contractAddress && /^0x[a-f0-9]{40}$/i.test(token.contractAddress)) {
    return `ethereum:${token.contractAddress}@8453/transfer?address=${address}&uint256=${amountBase}`;
  }
  // Without contract metadata, show the deposit address for a manual token transfer.
  return address;
}
