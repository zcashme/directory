/**
 * Parse token symbol from asset string
 * @param assetString - Asset string like "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near"
 * @returns Token symbol like "ARB" or null if parsing fails
 */
export function parseTokenSymbol(assetString: string | null | undefined): string | null {
  if (!assetString) return null;

  // Format: "nep141:arb-0xaf88d065e77c8cc2239327c5edb3a432268e5831.omft.near"
  // or "nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near"
  const match = assetString.match(/:([\w]+)-/);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }

  // Fallback: try to extract first part after colon
  const parts = assetString.split(':');
  if (parts.length > 1) {
    const tokenPart = parts[1].split('-')[0] || parts[1].split('.')[0];
    return tokenPart.toUpperCase();
  }

  return null;
}
