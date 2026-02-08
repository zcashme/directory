// Type definitions for zcashUtils

export interface ZcashAddressValidationResult {
  valid: boolean;
  type: "none" | "viewing_key" | "tex" | "transparent" | "sapling" | "unified" | "unknown";
  reason?: string;
}

export function validateZcashAddress(address?: string): ZcashAddressValidationResult;

export function getZcashAddressHint(address?: string): string;

export function buildZcashUri(params: {
  address: string;
  amount?: string | number;
  memo?: string;
  label?: string;
  message?: string;
}): string;

export function encodeMemo(text: string): string;
