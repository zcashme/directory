export const FIELD_FOCUS_INTERACTION_CLASSES =
  "transition-[border-color,border-width] duration-150 hover:border-blue-600 focus:border-blue-600 focus:border-2";

export const FIELD_ERROR_INTERACTION_CLASSES =
  "border-red-400 hover:border-red-500 focus:border-red-500 focus:border-2";

export const FIELD_FOCUS_WITHIN_INTERACTION_CLASSES =
  "transition-[border-color,border-width] duration-150 hover:border-blue-600 focus-within:border-blue-600 focus-within:border-2";

export const FIELD_FOCUS_WITHIN_ERROR_INTERACTION_CLASSES =
  "border-red-400 hover:border-red-500 focus-within:border-red-500 focus-within:border-2";

export const withFieldBorderState = (normalBorderClass: string, hasError = false) =>
  hasError
    ? FIELD_ERROR_INTERACTION_CLASSES
    : `${normalBorderClass} ${FIELD_FOCUS_INTERACTION_CLASSES}`;

export const withFieldFocusWithinBorderState = (normalBorderClass: string, hasError = false) =>
  hasError
    ? FIELD_FOCUS_WITHIN_ERROR_INTERACTION_CLASSES
    : `${normalBorderClass} ${FIELD_FOCUS_WITHIN_INTERACTION_CLASSES}`;
