/**
 * Common validation utilities for form inputs and data validation
 *
 * Provides composable validators that can be combined to create complex validation rules.
 * All validators return a standardized ValidationResult object.
 *
 * @module validators
 */

import type { Validator } from './types';

/**
 * Validates that a value is not empty
 *
 * Checks for null, undefined, empty strings, or strings with only whitespace.
 *
 * @param message - Custom error message (defaults to "This field is required")
 * @returns Validator function
 *
 * @example
 * ```ts
 * const validator = validateRequired('Name is required');
 * validator(''); // { valid: false, reason: 'Name is required', level: 'error' }
 * validator('John'); // { valid: true }
 * ```
 */
export function validateRequired(message?: string): Validator {
  return (value: string) => {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.length === 0) {
      return {
        valid: false,
        reason: message ?? 'This field is required',
        level: 'error',
      };
    }
    return { valid: true };
  };
}

/**
 * Validates email format using a standard email regex pattern
 *
 * Checks for basic email structure: local@domain with valid characters.
 * Does not validate email deliverability or existence.
 *
 * @returns Validator function
 *
 * @example
 * ```ts
 * const validator = validateEmail();
 * validator('invalid'); // { valid: false, reason: 'Please enter a valid email address', level: 'error' }
 * validator('user@example.com'); // { valid: true }
 * validator(''); // { valid: false, reason: 'Please enter a valid email address', level: 'error' }
 * ```
 */
export function validateEmail(): Validator {
  return (value: string) => {
    const trimmed = value?.trim();
    if (!trimmed) {
      return {
        valid: false,
        reason: 'Please enter a valid email address',
        level: 'error',
      };
    }

    // Standard email regex pattern
    // Allows: letters, numbers, dots, hyphens, underscores, plus signs in local part
    // Requires @ symbol and valid domain with TLD
    const emailRegex = /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(trimmed)) {
      return {
        valid: false,
        reason: 'Please enter a valid email address',
        level: 'error',
      };
    }

    return { valid: true };
  };
}

/**
 * Validates URL format and enforces HTTPS-only business rules
 *
 * Based on the existing isValidUrl implementation, this validates:
 * - URL format correctness
 * - HTTPS protocol requirement
 * - Blocks localhost, IP addresses, and link shorteners
 * - Warns about tracking parameters
 *
 * @returns Validator function
 *
 * @example
 * ```ts
 * const validator = validateUrl();
 * validator('https://example.com'); // { valid: true }
 * validator('http://example.com'); // { valid: false, reason: 'Only HTTPS links are allowed.', level: 'error' }
 * validator('https://bit.ly/abc'); // { valid: false, reason: 'Link shorteners or redirect URLs are not allowed.', level: 'error' }
 * validator('https://example.com?utm_source=x'); // { valid: true, reason: 'Please remove tracking parameters (e.g. ?t=…).', level: 'warning' }
 * ```
 */
export function validateUrl(): Validator {
  const BLOCKED_REDIRECTORS = new Set([
    't.co',
    'bit.ly',
    'tinyurl.com',
    'goo.gl',
    'linktr.ee',
    'lnks.gd',
    'rebrand.ly',
    'shorte.st',
    'trib.al',
    'buff.ly',
    'rb.gy',
    'ow.ly',
  ]);

  const TRACKING_PARAMS = [
    /^utm_/i,
    /^fbclid$/i,
    /^gclid$/i,
    /^ref$/i,
    /^ref_src$/i,
    /^mc_cid$/i,
    /^mc_eid$/i,
    /^t$/i,
    /^s$/i,
    /^si$/i,
  ];

  return (value: string) => {
    const trimmed = value?.trim();
    if (!trimmed) {
      return {
        valid: false,
        reason: 'Enter a URL.',
        level: 'error',
      };
    }

    // Validate URL format using browser's URL constructor
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      return {
        valid: false,
        reason: 'URL is not correctly formatted.',
        level: 'error',
      };
    }

    // Enforce HTTPS only
    if (url.protocol !== 'https:') {
      return {
        valid: false,
        reason: 'Only HTTPS links are allowed.',
        level: 'error',
      };
    }

    const hostname = url.hostname.toLowerCase();

    // Block localhost and IP addresses
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.local') ||
      /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)
    ) {
      return {
        valid: false,
        reason: 'Local network or IP-address URLs are not allowed.',
        level: 'error',
      };
    }

    // Block known link shorteners
    if (BLOCKED_REDIRECTORS.has(hostname)) {
      return {
        valid: false,
        reason: 'Link shorteners or redirect URLs (like bit.ly) are not allowed.',
        level: 'error',
      };
    }

    // Warn about tracking parameters (still valid but with warning)
    const params = Array.from(url.searchParams.keys());
    for (const key of params) {
      if (TRACKING_PARAMS.some((re) => re.test(key))) {
        return {
          valid: true,
          reason: 'Please remove tracking parameters (e.g. ?t=…).',
          level: 'warning',
        };
      }
    }

    return { valid: true };
  };
}

/**
 * Validates minimum length requirement
 *
 * @param min - Minimum number of characters required
 * @param message - Custom error message (defaults to "Must be at least {min} characters")
 * @returns Validator function
 *
 * @example
 * ```ts
 * const validator = validateMinLength(3, 'Username must be at least 3 characters');
 * validator('ab'); // { valid: false, reason: 'Username must be at least 3 characters', level: 'error' }
 * validator('abc'); // { valid: true }
 * validator(''); // { valid: false, reason: 'Username must be at least 3 characters', level: 'error' }
 * ```
 */
export function validateMinLength(min: number, message?: string): Validator {
  return (value: string) => {
    const length = value?.length ?? 0;
    if (length < min) {
      return {
        valid: false,
        reason: message ?? `Must be at least ${min} character${min === 1 ? '' : 's'}`,
        level: 'error',
      };
    }
    return { valid: true };
  };
}

/**
 * Validates maximum length requirement
 *
 * @param max - Maximum number of characters allowed
 * @param message - Custom error message (defaults to "Must be at most {max} characters")
 * @returns Validator function
 *
 * @example
 * ```ts
 * const validator = validateMaxLength(10, 'Username cannot exceed 10 characters');
 * validator('12345678901'); // { valid: false, reason: 'Username cannot exceed 10 characters', level: 'error' }
 * validator('1234567890'); // { valid: true }
 * validator(''); // { valid: true }
 * ```
 */
export function validateMaxLength(max: number, message?: string): Validator {
  return (value: string) => {
    const length = value?.length ?? 0;
    if (length > max) {
      return {
        valid: false,
        reason: message ?? `Must be at most ${max} character${max === 1 ? '' : 's'}`,
        level: 'error',
      };
    }
    return { valid: true };
  };
}

/**
 * Validates value against a custom regular expression pattern
 *
 * @param regex - Regular expression to test against
 * @param message - Error message to show on validation failure
 * @returns Validator function
 *
 * @example
 * ```ts
 * const validator = validatePattern(/^[0-9]+$/, 'Only numbers are allowed');
 * validator('abc'); // { valid: false, reason: 'Only numbers are allowed', level: 'error' }
 * validator('123'); // { valid: true }
 * validator(''); // { valid: false, reason: 'Only numbers are allowed', level: 'error' }
 * ```
 */
export function validatePattern(regex: RegExp, message: string): Validator {
  return (value: string) => {
    const trimmed = value?.trim() ?? '';
    if (!regex.test(trimmed)) {
      return {
        valid: false,
        reason: message,
        level: 'error',
      };
    }
    return { valid: true };
  };
}

/**
 * Validates that a value matches another field value (useful for password confirmation)
 *
 * @param otherValue - The value to match against
 * @param fieldName - Name of the field being matched (for error message)
 * @returns Validator function
 *
 * @example
 * ```ts
 * const password = 'secret123';
 * const validator = validateMatch(password, 'password');
 * validator('secret123'); // { valid: true }
 * validator('secret456'); // { valid: false, reason: 'Must match password', level: 'error' }
 * validator(''); // { valid: false, reason: 'Must match password', level: 'error' }
 * ```
 */
export function validateMatch(otherValue: string, fieldName: string): Validator {
  return (value: string) => {
    if (value !== otherValue) {
      return {
        valid: false,
        reason: `Must match ${fieldName}`,
        level: 'error',
      };
    }
    return { valid: true };
  };
}

/**
 * Composes multiple validators into a single validator
 *
 * Runs validators in sequence and returns the first validation error encountered.
 * If all validators pass, returns { valid: true }.
 *
 * This allows combining multiple validation rules for complex validation logic.
 *
 * @param validators - Array of validator functions to compose
 * @returns Combined validator function
 *
 * @example
 * ```ts
 * const validator = composeValidators(
 *   validateRequired('Username is required'),
 *   validateMinLength(3),
 *   validateMaxLength(20),
 *   validatePattern(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed')
 * );
 *
 * validator(''); // { valid: false, reason: 'Username is required', level: 'error' }
 * validator('ab'); // { valid: false, reason: 'Must be at least 3 characters', level: 'error' }
 * validator('abc'); // { valid: true }
 * validator('abc$'); // { valid: false, reason: 'Only letters, numbers, and underscores allowed', level: 'error' }
 * ```
 */
export function composeValidators(...validators: Validator[]): Validator {
  return (value: string) => {
    for (const validator of validators) {
      const result = validator(value);
      if (!result.valid) {
        return result;
      }
      // If valid but has a warning/info, return it (for tracking params etc.)
      if (result.level === 'warning' || result.level === 'info') {
        return result;
      }
    }
    return { valid: true };
  };
}

/**
 * Creates a validator that only runs if the value is not empty
 *
 * Useful for optional fields that should be validated only when provided.
 *
 * @param validator - The validator to run conditionally
 * @returns Conditional validator function
 *
 * @example
 * ```ts
 * const validator = validateOptional(validateEmail());
 * validator(''); // { valid: true } - empty is valid for optional
 * validator('invalid'); // { valid: false, reason: 'Please enter a valid email address', level: 'error' }
 * validator('user@example.com'); // { valid: true }
 * ```
 */
export function validateOptional(validator: Validator): Validator {
  return (value: string) => {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.length === 0) {
      return { valid: true };
    }
    return validator(value);
  };
}

/**
 * Validates numeric input within a range
 *
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @param message - Custom error message
 * @returns Validator function
 *
 * @example
 * ```ts
 * const validator = validateRange(1, 100, 'Must be between 1 and 100');
 * validator('0'); // { valid: false, reason: 'Must be between 1 and 100', level: 'error' }
 * validator('50'); // { valid: true }
 * validator('101'); // { valid: false, reason: 'Must be between 1 and 100', level: 'error' }
 * validator('abc'); // { valid: false, reason: 'Must be a valid number', level: 'error' }
 * ```
 */
export function validateRange(min: number, max: number, message?: string): Validator {
  return (value: string) => {
    const num = Number(value);
    if (isNaN(num)) {
      return {
        valid: false,
        reason: 'Must be a valid number',
        level: 'error',
      };
    }
    if (num < min || num > max) {
      return {
        valid: false,
        reason: message ?? `Must be between ${min} and ${max}`,
        level: 'error',
      };
    }
    return { valid: true };
  };
}

/**
 * Validates numeric string is digits only (useful for OTP, phone numbers)
 *
 * @param message - Custom error message
 * @returns Validator function
 *
 * @example
 * ```ts
 * const validator = validateDigitsOnly('OTP must contain only numbers');
 * validator('123456'); // { valid: true }
 * validator('12a456'); // { valid: false, reason: 'OTP must contain only numbers', level: 'error' }
 * validator(''); // { valid: false, reason: 'OTP must contain only numbers', level: 'error' }
 * ```
 */
export function validateDigitsOnly(message?: string): Validator {
  return validatePattern(/^[0-9]+$/, message ?? 'Must contain only digits');
}

/**
 * Validates exact length requirement
 *
 * @param length - Required exact length
 * @param message - Custom error message
 * @returns Validator function
 *
 * @example
 * ```ts
 * const validator = validateExactLength(6, 'OTP must be exactly 6 digits');
 * validator('123'); // { valid: false, reason: 'OTP must be exactly 6 digits', level: 'error' }
 * validator('123456'); // { valid: true }
 * validator('1234567'); // { valid: false, reason: 'OTP must be exactly 6 digits', level: 'error' }
 * ```
 */
export function validateExactLength(length: number, message?: string): Validator {
  return (value: string) => {
    const len = value?.length ?? 0;
    if (len !== length) {
      return {
        valid: false,
        reason: message ?? `Must be exactly ${length} character${length === 1 ? '' : 's'}`,
        level: 'error',
      };
    }
    return { valid: true };
  };
}
