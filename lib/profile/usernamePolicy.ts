export const sanitizeUsernameInput = (raw: string): string =>
  (raw ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_-]/g, "");

export const normalizeUsernameForCompare = (value: string): string =>
  sanitizeUsernameInput(value).toLowerCase();

export const normalizeUsernameForSlug = (value: string): string =>
  sanitizeUsernameInput(value).toLowerCase();
