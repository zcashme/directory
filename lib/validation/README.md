# Validation Utilities

Phase 2.2 of the design system - Comprehensive validation utilities for form inputs and data validation.

## Overview

This module provides a type-safe, composable validation system with:
- **Standardized validation results** with severity levels (error, warning, info)
- **Common validators** for typical form inputs (email, URL, length, pattern, etc.)
- **Composable validators** for complex validation logic
- **React hooks** for managing validation state in forms
- **Multi-field validation** with coordinated validation groups

## Files

- **`types.ts`** - Core TypeScript interfaces (`ValidationResult`, `Validator`)
- **`validators.ts`** - Common validator functions
- **`useValidation.ts`** - React hooks for validation state management
- **`index.ts`** - Barrel exports

## Basic Usage

### Simple Validator

```typescript
import { validateEmail } from '@/lib/validation';

const result = validateEmail()('user@example.com');
if (!result.valid) {
  console.error(result.reason);
}
```

### Composing Validators

```typescript
import { composeValidators, validateRequired, validateMinLength } from '@/lib/validation';

const usernameValidator = composeValidators(
  validateRequired('Username is required'),
  validateMinLength(3, 'Must be at least 3 characters')
);

const result = usernameValidator('ab');
// { valid: false, reason: 'Must be at least 3 characters', level: 'error' }
```

### React Form Validation

```tsx
import { useValidation, validateRequired, validateEmail } from '@/lib/validation';

function EmailField() {
  const { value, setValue, validation, isTouched, setTouched } = useValidation({
    initialValue: '',
    validators: [validateRequired('Email is required'), validateEmail()],
    validateOnBlur: true,
  });

  return (
    <div>
      <input
        type="email"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => setTouched(true)}
      />
      {isTouched && !validation.valid && (
        <p className="error">{validation.reason}</p>
      )}
    </div>
  );
}
```

### Multi-Field Forms

```tsx
import { useValidation, useValidationGroup, validateRequired, validateMatch } from '@/lib/validation';

function SignupForm() {
  const password = useValidation({
    initialValue: '',
    validators: [validateRequired('Password is required')],
  });

  const confirmPassword = useValidation({
    initialValue: '',
    validators: [
      validateRequired('Please confirm password'),
      validateMatch(password.value, 'password')
    ],
  });

  const form = useValidationGroup({ password, confirmPassword });

  const handleSubmit = () => {
    if (form.validateAll()) {
      // All fields valid - submit form
      console.log(form.values);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button disabled={!form.isValid}>Submit</button>
    </form>
  );
}
```

## Available Validators

### Core Validators
- **`validateRequired(message?)`** - Checks for non-empty values
- **`validateEmail()`** - Standard email format validation
- **`validateUrl()`** - URL validation with HTTPS enforcement
- **`validateMinLength(min, message?)`** - Minimum character length
- **`validateMaxLength(max, message?)`** - Maximum character length
- **`validateExactLength(length, message?)`** - Exact character length
- **`validatePattern(regex, message)`** - Custom regex pattern matching
- **`validateMatch(otherValue, fieldName)`** - Value matching (for password confirmation)

### Utility Validators
- **`validateOptional(validator)`** - Makes a validator optional (valid if empty)
- **`validateRange(min, max, message?)`** - Numeric range validation
- **`validateDigitsOnly(message?)`** - Validates only numeric digits
- **`composeValidators(...validators)`** - Combines multiple validators

## Validation Levels

The `ValidationResult` interface supports three severity levels:

- **`error`** - Validation failed, value is invalid (default for invalid)
- **`warning`** - Validation passed but with concerns (e.g., tracking parameters in URLs)
- **`info`** - Validation passed with informational message

```typescript
// Error example
{ valid: false, reason: 'Email is required', level: 'error' }

// Warning example (URL with tracking params)
{ valid: true, reason: 'Please remove tracking parameters', level: 'warning' }

// Success example
{ valid: true }
```

## React Hook API

### `useValidation<T>(options)`

**Options:**
- `initialValue: T` - Initial field value
- `validators?: Validator<T>[]` - Array of validators
- `validateOnChange?: boolean` - Auto-validate on change (default: false)
- `validateOnBlur?: boolean` - Auto-validate on blur (default: true)

**Returns:**
- `value: T` - Current value
- `setValue(value, shouldValidate?)` - Update value
- `validation: ValidationResult` - Current validation state
- `validate(): boolean` - Manually trigger validation
- `reset()` - Reset to initial state
- `isDirty: boolean` - Whether value changed from initial
- `isTouched: boolean` - Whether field has been interacted with
- `setTouched(boolean)` - Mark field as touched

### `useValidationGroup(validations)`

Manages multiple related validations.

**Returns:**
- `validateAll(): boolean` - Validate all fields
- `resetAll()` - Reset all fields
- `isValid: boolean` - Whether all fields are valid
- `isDirty: boolean` - Whether any field is dirty
- `isTouched: boolean` - Whether any field is touched
- `values: object` - All current values
- `validationResults: object` - All validation results

## Integration with Existing Code

This validation system is designed to work alongside existing validation patterns:

- **URL validation** - Compatible with `lib/profile/validateUrl.ts` patterns
- **Zcash addresses** - Can be extended with patterns from `lib/zcash/zcashUtils.ts`
- **OTP validation** - Supports digit-only and exact-length validation like `ui/verification/SubmitOtp.tsx`

## Testing

All validators have been tested for edge cases:
- Empty strings
- Whitespace-only strings
- Null/undefined values
- Boundary conditions (min/max lengths, ranges)
- Invalid formats
- Valid formats
- Warning levels (e.g., URL tracking parameters)

## TypeScript Support

Full TypeScript support with:
- Generic `Validator<T>` type for any value type
- Strict type checking for all validator parameters
- Comprehensive JSDoc comments
- Type inference for `useValidation` and `useValidationGroup`

## Examples

See the implementation for detailed examples:
- Simple field validation
- Complex multi-field forms
- Optional field validation
- Custom validators with regex patterns
- Composed validators for complex rules
