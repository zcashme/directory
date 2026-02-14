/**
 * Validation result object returned by all validators
 *
 * @property valid - Whether the value passes validation
 * @property reason - Optional message describing why validation failed or additional info
 * @property level - Severity level of the validation result (defaults to 'error' for invalid)
 *
 * @example
 * ```ts
 * const result: ValidationResult = {
 *   valid: false,
 *   reason: 'Email is required',
 *   level: 'error'
 * }
 * ```
 */
export interface ValidationResult {
  /**
   * Whether the validation passed
   */
  valid: boolean;

  /**
   * Optional reason message (for errors, warnings, or info)
   * Null when valid and no additional info needed
   */
  reason?: string | null;

  /**
   * Severity level of the validation result
   * - 'error': Validation failed, value is invalid
   * - 'warning': Validation passed but with concerns
   * - 'info': Validation passed with informational message
   */
  level?: 'error' | 'warning' | 'info';
}

/**
 * A validator function that validates a value of type T
 *
 * @template T - The type of value to validate (defaults to string)
 * @param value - The value to validate
 * @returns ValidationResult indicating if value is valid
 *
 * @example
 * ```ts
 * const emailValidator: Validator = (value) => {
 *   if (!value) return { valid: false, reason: 'Email is required', level: 'error' }
 *   if (!value.includes('@')) return { valid: false, reason: 'Invalid email format', level: 'error' }
 *   return { valid: true }
 * }
 * ```
 */
export type Validator<T = string> = (value: T) => ValidationResult;
