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
  | "dns-lookup-failed"
  | "no-txt-record"
  | "txt-mismatch"
  | "internal-error";

export interface DomainDnsInstructions {
  /** Full record name to add, e.g. "_zcashme.example.com" */
  name: string;
  /** Full record value to add, e.g. "verify=abc123def456789" */
  value: string;
}
