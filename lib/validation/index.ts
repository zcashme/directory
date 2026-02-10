/**
 * Validation utilities for form inputs and data validation
 *
 * This module provides a comprehensive validation system with:
 * - Type-safe validation result interface
 * - Common validator functions (email, URL, length, pattern, etc.)
 * - Composable validators for complex validation logic
 * - React hook for managing validation state in forms
 * - Multi-field validation group management
 *
 * @module validation
 *
 * @example Basic validator usage
 * ```ts
 * import { validateEmail, validateRequired, composeValidators } from '@/lib/validation';
 *
 * const emailValidator = composeValidators(
 *   validateRequired('Email is required'),
 *   validateEmail()
 * );
 *
 * const result = emailValidator('user@example.com');
 * if (!result.valid) {
 *   console.error(result.reason);
 * }
 * ```
 *
 * @example React form validation
 * ```tsx
 * import { useValidation, validateRequired, validateMinLength } from '@/lib/validation';
 *
 * function MyForm() {
 *   const username = useValidation({
 *     initialValue: '',
 *     validators: [
 *       validateRequired('Username is required'),
 *       validateMinLength(3, 'Must be at least 3 characters')
 *     ],
 *     validateOnBlur: true
 *   });
 *
 *   return (
 *     <div>
 *       <input
 *         value={username.value}
 *         onChange={(e) => username.setValue(e.target.value)}
 *         onBlur={() => username.setTouched(true)}
 *       />
 *       {username.isTouched && !username.validation.valid && (
 *         <p className="error">{username.validation.reason}</p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */

// Type exports
export type { ValidationResult, Validator } from './types';

// Validator function exports
export {
  validateRequired,
  validateEmail,
  validateUrl,
  validateMinLength,
  validateMaxLength,
  validatePattern,
  validateMatch,
  validateOptional,
  validateRange,
  validateDigitsOnly,
  validateExactLength,
  composeValidators,
} from './validators';

// React hook exports
export { useValidation, useValidationGroup } from './useValidation';
export type { UseValidationOptions, UseValidationResult } from './useValidation';
