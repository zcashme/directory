/**
 * React hook for managing validation state
 *
 * Provides a unified interface for handling form field validation with support for
 * validation on change, blur, and manual triggers.
 *
 * @module useValidation
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Validator, ValidationResult } from './types';

/**
 * Configuration options for the useValidation hook
 *
 * @template T - The type of value being validated (defaults to string)
 *
 * @property initialValue - The initial value of the field
 * @property validators - Optional array of validator functions to apply
 * @property validateOnChange - Whether to validate on every change (default: false)
 * @property validateOnBlur - Whether to validate on blur (default: true)
 */
export interface UseValidationOptions<T = string> {
  /**
   * Initial value for the field
   */
  initialValue: T;

  /**
   * Array of validator functions to run against the value
   * Validators are run in order, stopping at the first error
   */
  validators?: Validator<T>[];

  /**
   * Whether to automatically validate on every value change
   * @default false
   */
  validateOnChange?: boolean;

  /**
   * Whether to automatically validate when field loses focus
   * @default true
   */
  validateOnBlur?: boolean;
}

/**
 * Return value from the useValidation hook
 *
 * @template T - The type of value being validated
 *
 * @property value - Current value of the field
 * @property setValue - Function to update the value (with optional validation)
 * @property validation - Current validation result
 * @property validate - Function to manually trigger validation
 * @property reset - Function to reset to initial state
 * @property isDirty - Whether the value has been modified from initial
 * @property isTouched - Whether the field has been interacted with
 * @property setTouched - Function to mark field as touched
 */
export interface UseValidationResult<T = string> {
  /**
   * Current value of the field
   */
  value: T;

  /**
   * Update the field value
   * @param value - New value
   * @param shouldValidate - Override validateOnChange setting for this update
   */
  setValue: (value: T, shouldValidate?: boolean) => void;

  /**
   * Current validation state
   * Contains { valid: true } if not yet validated or validation passed
   */
  validation: ValidationResult;

  /**
   * Manually trigger validation
   * @returns true if valid, false if invalid
   */
  validate: () => boolean;

  /**
   * Reset field to initial value and clear validation
   */
  reset: () => void;

  /**
   * Whether the value has changed from initial value
   */
  isDirty: boolean;

  /**
   * Whether the field has been interacted with (focused/blurred)
   */
  isTouched: boolean;

  /**
   * Mark the field as touched
   */
  setTouched: (touched: boolean) => void;
}

/**
 * Custom hook for managing field validation state
 *
 * Handles validation logic, state management, and provides utilities
 * for form field validation patterns.
 *
 * @template T - The type of value being validated (defaults to string)
 * @param options - Configuration options
 * @returns Validation state and control functions
 *
 * @example Basic usage
 * ```tsx
 * function EmailField() {
 *   const { value, setValue, validation, validate, isTouched, setTouched } = useValidation({
 *     initialValue: '',
 *     validators: [validateRequired('Email is required'), validateEmail()],
 *     validateOnChange: false,
 *     validateOnBlur: true
 *   });
 *
 *   return (
 *     <div>
 *       <input
 *         type="email"
 *         value={value}
 *         onChange={(e) => setValue(e.target.value)}
 *         onBlur={() => {
 *           setTouched(true);
 *           validate();
 *         }}
 *       />
 *       {isTouched && !validation.valid && (
 *         <p className="error">{validation.reason}</p>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example With composition
 * ```tsx
 * function PasswordField() {
 *   const password = useValidation({
 *     initialValue: '',
 *     validators: [
 *       validateRequired('Password is required'),
 *       validateMinLength(8, 'Password must be at least 8 characters')
 *     ],
 *   });
 *
 *   const confirmPassword = useValidation({
 *     initialValue: '',
 *     validators: [
 *       validateRequired('Please confirm password'),
 *       validateMatch(password.value, 'password')
 *     ],
 *   });
 *
 *   const handleSubmit = () => {
 *     const passwordValid = password.validate();
 *     const confirmValid = confirmPassword.validate();
 *     if (passwordValid && confirmValid) {
 *       // Submit form
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input
 *         type="password"
 *         value={password.value}
 *         onChange={(e) => password.setValue(e.target.value)}
 *       />
 *       <input
 *         type="password"
 *         value={confirmPassword.value}
 *         onChange={(e) => confirmPassword.setValue(e.target.value)}
 *       />
 *     </form>
 *   );
 * }
 * ```
 *
 * @example Validation on submit only
 * ```tsx
 * function UsernameField() {
 *   const { value, setValue, validation, validate } = useValidation({
 *     initialValue: '',
 *     validators: [
 *       validateRequired('Username is required'),
 *       validateMinLength(3),
 *       validateMaxLength(20)
 *     ],
 *     validateOnChange: false, // Don't validate while typing
 *     validateOnBlur: false, // Don't validate on blur
 *   });
 *
 *   const handleSubmit = () => {
 *     if (validate()) {
 *       // Submit
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input value={value} onChange={(e) => setValue(e.target.value)} />
 *       <button onClick={handleSubmit}>Submit</button>
 *       {!validation.valid && <p>{validation.reason}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useValidation<T = string>(
  options: UseValidationOptions<T>
): UseValidationResult<T> {
  const {
    initialValue,
    validators = [],
    validateOnChange = false,
    validateOnBlur = true,
  } = options;

  // State
  const [value, setValueState] = useState<T>(initialValue);
  const [validation, setValidation] = useState<ValidationResult>({ valid: true });
  const [isTouched, setIsTouched] = useState(false);

  // Check if value has changed from initial
  const isDirty = useMemo(() => {
    return value !== initialValue;
  }, [value, initialValue]);

  /**
   * Run all validators against current value
   * Returns the first error or { valid: true }
   */
  const runValidators = useCallback(
    (valueToValidate: T): ValidationResult => {
      if (validators.length === 0) {
        return { valid: true };
      }

      for (const validator of validators) {
        const result = validator(valueToValidate);
        if (!result.valid) {
          return result;
        }
        // If valid but has a warning/info level, return it
        if (result.level === 'warning' || result.level === 'info') {
          return result;
        }
      }

      return { valid: true };
    },
    [validators]
  );

  /**
   * Validate the current value
   * Updates validation state and returns validity
   */
  const validate = useCallback((): boolean => {
    const result = runValidators(value);
    setValidation(result);
    return result.valid;
  }, [value, runValidators]);

  /**
   * Update the value with optional validation
   */
  const setValue = useCallback(
    (newValue: T, shouldValidate?: boolean) => {
      setValueState(newValue);

      // Determine if we should validate
      const doValidate = shouldValidate ?? validateOnChange;

      if (doValidate) {
        const result = runValidators(newValue);
        setValidation(result);
      }
    },
    [validateOnChange, runValidators]
  );

  /**
   * Mark field as touched
   */
  const setTouched = useCallback(
    (touched: boolean) => {
      setIsTouched(touched);

      // Validate on blur if enabled and field is being marked as touched
      if (touched && validateOnBlur) {
        const result = runValidators(value);
        setValidation(result);
      }
    },
    [validateOnBlur, value, runValidators]
  );

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setValueState(initialValue);
    setValidation({ valid: true });
    setIsTouched(false);
  }, [initialValue]);

  return {
    value,
    setValue,
    validation,
    validate,
    reset,
    isDirty,
    isTouched,
    setTouched,
  };
}

/**
 * Helper hook for managing multiple related validations
 *
 * Useful for forms with multiple fields that need coordinated validation.
 *
 * @param validations - Object mapping field names to useValidation results
 * @returns Object with validation utilities
 *
 * @example
 * ```tsx
 * function SignupForm() {
 *   const username = useValidation({
 *     initialValue: '',
 *     validators: [validateRequired(), validateMinLength(3)]
 *   });
 *
 *   const email = useValidation({
 *     initialValue: '',
 *     validators: [validateRequired(), validateEmail()]
 *   });
 *
 *   const form = useValidationGroup({ username, email });
 *
 *   const handleSubmit = () => {
 *     if (form.validateAll()) {
 *       // All fields valid, submit form
 *       console.log(form.values); // { username: '...', email: '...' }
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input value={username.value} onChange={e => username.setValue(e.target.value)} />
 *       <input value={email.value} onChange={e => email.setValue(e.target.value)} />
 *       <button disabled={!form.isValid}>Submit</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useValidationGroup<T extends Record<string, UseValidationResult<any>>>(
  validations: T
) {
  /**
   * Validate all fields in the group
   * @returns true if all fields are valid
   */
  const validateAll = useCallback((): boolean => {
    let allValid = true;
    for (const field of Object.values(validations)) {
      const isValid = field.validate();
      if (!isValid) {
        allValid = false;
      }
    }
    return allValid;
  }, [validations]);

  /**
   * Reset all fields in the group
   */
  const resetAll = useCallback(() => {
    for (const field of Object.values(validations)) {
      field.reset();
    }
  }, [validations]);

  /**
   * Check if all fields are currently valid
   */
  const isValid = useMemo(() => {
    return Object.values(validations).every((field) => field.validation.valid);
  }, [validations]);

  /**
   * Check if any field has been modified
   */
  const isDirty = useMemo(() => {
    return Object.values(validations).some((field) => field.isDirty);
  }, [validations]);

  /**
   * Check if any field has been touched
   */
  const isTouched = useMemo(() => {
    return Object.values(validations).some((field) => field.isTouched);
  }, [validations]);

  /**
   * Get all current values as an object
   */
  const values = useMemo(() => {
    const result: Record<string, any> = {};
    for (const [key, field] of Object.entries(validations)) {
      result[key] = field.value;
    }
    return result as { [K in keyof T]: T[K]['value'] };
  }, [validations]);

  /**
   * Get all validation results as an object
   */
  const validationResults = useMemo(() => {
    const result: Record<string, ValidationResult> = {};
    for (const [key, field] of Object.entries(validations)) {
      result[key] = field.validation;
    }
    return result as { [K in keyof T]: ValidationResult };
  }, [validations]);

  return {
    validateAll,
    resetAll,
    isValid,
    isDirty,
    isTouched,
    values,
    validationResults,
  };
}
