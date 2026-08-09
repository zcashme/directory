/**
 * PGPZ-specific post-verification profile proof.
 *
 * This is deliberately isolated from core OIDC behavior. A normal PGPZ OIDC
 * request has no label and writes no link; a valid optional PGPZ label asks
 * auth-service to publish this server-derived proof after wallet verification.
 */

export interface PgpzProofLink {
  platform: "PGPZ";
  label: string;
  url: string;
  is_verified: true;
}

// PGPZ currently creates `PGPZ-${randomBytes(5).toString("hex").toUpperCase()}`.
const PGPZ_LABEL = /^PGPZ-[0-9A-F]{10}$/;

export function getPgpzProofLink(
  clientId: unknown,
  requestedLabel: unknown,
): PgpzProofLink | undefined {
  if (requestedLabel === undefined || requestedLabel === null || requestedLabel === "") {
    return undefined;
  }

  if (clientId !== "pgpz") {
    throw new Error("Only PGPZ may request a PGPZ proof link.");
  }

  if (typeof requestedLabel !== "string" || !PGPZ_LABEL.test(requestedLabel)) {
    throw new Error("Invalid PGPZ proof label.");
  }

  return {
    platform: "PGPZ",
    label: requestedLabel,
    url: `https://community.pgpz.org/challenge/${encodeURIComponent(requestedLabel)}`,
    is_verified: true,
  };
}
