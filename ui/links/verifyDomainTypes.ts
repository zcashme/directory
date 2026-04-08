// Shared types for domain verification.
// Kept in a non-"use server" file so client components can import the type.

export type VerifyDomainError =
  | "address-not-verified"
  | "link-not-found"
  | "already-verified"
  | "invalid-domain"
  | "private-host-blocked"
  | "fetch-failed"
  | "timeout"
  | "no-rel-me-tag"
  | "rel-me-mismatch"
  | "internal-error";
