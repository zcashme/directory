// Server action result types

/**
 * Generic server action result (discriminated union)
 */
type ServerActionResult<T> =
  | { ok: true; data: T; error?: undefined }
  | { ok: false; error: string; data?: undefined; retryable?: boolean };

/**
 * Short alias for ServerActionResult
 */
export type Result<T> = ServerActionResult<T>;

/**
 * Action result that returns void on success
 */
export type VoidActionResult =
  | { ok: true }
  | { ok: false; error: string; retryable?: boolean };
