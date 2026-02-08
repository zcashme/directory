// Shared utility types

import type { ReactNode } from "react";

/**
 * Button callback type
 */
export type ButtonCallback = (
  e?: React.MouseEvent<HTMLButtonElement>
) => void | Promise<void>;

/**
 * Generic callback type
 */
export type Callback<T = void> = (value: T) => void | Promise<void>;

/**
 * Form field props
 */
export interface FormFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

/**
 * Modal control props
 */
export interface ModalControlProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Dropdown result type
 */
export interface DropdownResult<T> {
  selected: T | null;
  isOpen: boolean;
}

/**
 * Children prop type
 */
export interface ChildrenProps {
  children: ReactNode;
}

/**
 * Class name prop type
 */
export interface ClassNameProps {
  className?: string;
}

/**
 * Common component props
 */
export interface BaseComponentProps extends ChildrenProps, ClassNameProps {}

/**
 * Link authentication state
 */
export interface LinkAuthState {
  provider?: string; // "twitter" | "github" | "discord"
  token?: string; // OAuth token
  isPending?: boolean;
}
