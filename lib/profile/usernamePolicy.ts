import { sanitizeZnsUsernameInput } from "@/lib/zns/name";

export const sanitizeUsernameInput = (raw: string): string =>
  sanitizeZnsUsernameInput(raw);

export const sanitizeLegacyUsernameInput = (raw: string): string =>
  (raw ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "");

export const normalizeUsernameForCompare = (value: string): string =>
  sanitizeLegacyUsernameInput(value).toLowerCase();

export const normalizeUsernameForSlug = (value: string): string =>
  sanitizeUsernameInput(value) || sanitizeLegacyUsernameInput(value).toLowerCase();
