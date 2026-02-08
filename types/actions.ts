// Server action result types

/**
 * Generic server action result (discriminated union)
 * Use this for all server actions to ensure consistent error handling
 */
export type ServerActionResult<T> =
  | { ok: true; data: T; error?: undefined }
  | { ok: false; error: string; data?: undefined; retryable?: boolean };

/**
 * Alias for ServerActionResult
 */
export type Result<T> = ServerActionResult<T>;

/**
 * Action result with no data (just success/error)
 */
export type ActionResult = ServerActionResult<null>;

/**
 * Action result that returns void on success
 */
export type VoidActionResult =
  | { ok: true }
  | { ok: false; error: string; retryable?: boolean };
