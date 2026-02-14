import type { ReactNode } from "react";

/**
 * Represents a single option in a dropdown menu.
 *
 * @template T - The type of the option's id value (defaults to string)
 */
export interface DropdownOption<T = string> {
  /** Unique identifier for the option */
  id: T;
  /** Display label for the option */
  label: string;
  /** Optional additional description text */
  description?: string;
  /** Optional icon element to display alongside the label */
  icon?: ReactNode;
  /** Whether the option is disabled and cannot be selected */
  disabled?: boolean;
}

/**
 * Props for the DropdownOptionComponent.
 *
 * @template T - The type of the option's id value
 */
export interface DropdownOptionComponentProps<T = string> {
  /** The option data to render */
  option: DropdownOption<T>;
  /** Whether this option is currently selected */
  isSelected: boolean;
  /** Callback when the option is clicked */
  onClick: () => void;
  /** Optional custom render function for the option content */
  renderOption?: (option: DropdownOption<T>) => ReactNode;
}

/**
 * DropdownOptionComponent
 *
 * Renders a single option item within a dropdown menu. Displays the option's
 * icon, label, and description with appropriate styling for selected and
 * hover states.
 *
 * Features:
 * - Visual indicator for selected state (blue background)
 * - Hover state with gray background
 * - Support for icons and descriptions
 * - Disabled state support
 * - Custom rendering via renderOption prop
 *
 * @template T - The type of the option's id value
 *
 * @example
 * ```tsx
 * <DropdownOptionComponent
 *   option={{ id: 'usd', label: 'US Dollar', description: 'USD' }}
 *   isSelected={true}
 *   onClick={() => console.log('Selected USD')}
 * />
 * ```
 */
export default function DropdownOptionComponent<T = string>({
  option,
  isSelected,
  onClick,
  renderOption,
}: DropdownOptionComponentProps<T>) {
  // Use custom renderer if provided
  if (renderOption) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={option.disabled}
        className={`w-full px-3 py-2 text-left text-sm transition-colors ${
          option.disabled
            ? "opacity-50 cursor-not-allowed"
            : isSelected
            ? "bg-blue-50 text-blue-700"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        {renderOption(option)}
      </button>
    );
  }

  // Default rendering
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={option.disabled}
      className={`w-full px-3 py-2 text-left text-sm flex items-start gap-2 transition-colors ${
        option.disabled
          ? "opacity-50 cursor-not-allowed"
          : isSelected
          ? "bg-blue-50 text-blue-700"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {option.icon && (
        <span className="flex-shrink-0 mt-0.5">{option.icon}</span>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{option.label}</div>
        {option.description && (
          <div className="text-xs text-gray-500 truncate mt-0.5">
            {option.description}
          </div>
        )}
      </div>
    </button>
  );
}
