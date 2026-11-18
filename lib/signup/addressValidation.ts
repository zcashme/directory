import { ZNS } from "zcashname-sdk";

const zns = new ZNS({ network: "mainnet" });

export const SIGNUP_ADDRESS_ERROR = "Enter a valid Unified Zcash address (u1…). Transparent and Sapling addresses are not supported.";

export function isValidSignupAddress(address: string): boolean {
  return zns.isValidUnifiedAddress((address ?? "").trim());
}
