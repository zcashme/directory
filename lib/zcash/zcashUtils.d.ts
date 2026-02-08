// Type definitions for zcashUtils

export interface ZcashAddressValidationResult {
  valid: boolean;
  type: "none" | "viewing_key" | "tex" | "transparent" | "sapling" | "unified" | "unknown";
  reason?: string;
}

export function validateZcashAddress(_address?: string): ZcashAddressValidationResult;

export function getZcashAddressHint(_address?: string): string;

export function buildZcashUri(_params: {
  address: string;
  amount?: string | number;
  memo?: string;
  label?: string;
  message?: string;
}): string;

export function encodeMemo(_text: string): string;
