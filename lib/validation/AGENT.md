# /lib/validation - Form Validators

## Purpose
Composable, reusable validators for form inputs. Pure functions that return
structured validation results.

## Key Files

### validators.ts
Core validator functions:

```typescript
interface ValidationResult {
  valid: boolean;
  reason?: string;
  level?: 'error' | 'warning' | 'info';
}

// Basic validators
required(value: string): ValidationResult
minLength(min: number): (value: string) => ValidationResult
maxLength(max: number): (value: string) => ValidationResult
email(value: string): ValidationResult
url(value: string): ValidationResult
digits(value: string): ValidationResult
range(min: number, max: number): (value: number) => ValidationResult

// Composable pattern
compose(...validators): (value: any) => ValidationResult
```

### useValidation.ts
React hook for form validation state:

```typescript
function useValidation<T>(
  value: T,
  validators: Validator<T>[]
): {
  valid: boolean;
  error?: string;
  level?: 'error' | 'warning' | 'info';
  touched: boolean;
  setTouched: () => void;
}
```

## Usage Examples

```typescript
// Simple validation
const result = required('');
// { valid: false, reason: 'Required' }

// Composed validators
const validateUsername = compose(
  required,
  minLength(3),
  maxLength(30),
  (v) => /^[a-z0-9_]+$/.test(v)
    ? { valid: true }
    : { valid: false, reason: 'Invalid characters' }
);

// In React component
const { valid, error } = useValidation(username, [
  required,
  minLength(3)
]);
```

## Zcash-Specific Validators
Zcash address validation lives in `/lib/zcash/zcashUtils.ts` but follows
the same `{ valid, reason }` pattern for consistency.

## Testing Harness
All validators are pure functions - trivial to test:

```typescript
test('required rejects empty', () => {
  expect(required('')).toEqual({ valid: false, reason: 'Required' });
});

test('email validates format', () => {
  expect(email('test@example.com').valid).toBe(true);
  expect(email('invalid').valid).toBe(false);
});
```

## Adding New Validators
1. Add function to `validators.ts`
2. Return `{ valid: boolean, reason?: string, level?: string }`
3. Make it composable (curry if needs config)
4. Export from `index.ts`
