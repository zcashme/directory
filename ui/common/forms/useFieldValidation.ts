import { useState, useEffect } from "react";

export interface ValidationResult {
  valid: boolean;
  reason?: string | null;
}

export interface FieldValidationState {
  valid: boolean;
  reason: string | null;
}

export interface UseFieldValidationOptions {
  value: string;
  error?: boolean;
  errorMessage?: string;
  infoMessage?: string;
  validate?: (value: string) => ValidationResult;
  showValidation?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
}

export interface UseFieldValidationResult {
  validationState: FieldValidationState;
  hasError: boolean;
  hasInfo: boolean;
  displayMessage: string | undefined;
  getBorderClass: () => string;
}

/**
 * Shared validation logic for form fields (Input, TextArea, etc.)
 */
export function useFieldValidation({
  value,
  error = false,
  errorMessage,
  infoMessage,
  validate,
  showValidation = false,
  readOnly = false,
  disabled = false,
}: UseFieldValidationOptions): UseFieldValidationResult {
  const [validationState, setValidationState] = useState<FieldValidationState>({
    valid: true,
    reason: null,
  });

  useEffect(() => {
    if (!validate || !value) {
      setValidationState({ valid: true, reason: null });
      return;
    }
    const result = validate(value.trim());
    setValidationState({
      valid: result.valid,
      reason: result.reason || null,
    });
  }, [value, validate]);

  const hasError = error || (showValidation && !validationState.valid);
  const hasInfo = !hasError && validationState.valid && Boolean(validationState.reason);
  const displayMessage = errorMessage || validationState.reason || infoMessage;

  const getBorderClass = () => {
    if (readOnly || disabled) {
      return "border-black/40 bg-gray-100 text-gray-500 cursor-not-allowed";
    }
    if (hasError) {
      return "border-red-400 focus:border-red-500";
    }
    if (hasInfo) {
      return "border-[var(--color-brand-blue)] focus:border-[var(--color-brand-blue)]";
    }
    return "border-black/30 focus:border-[var(--color-brand-blue)]";
  };

  return {
    validationState,
    hasError,
    hasInfo,
    displayMessage,
    getBorderClass,
  };
}
