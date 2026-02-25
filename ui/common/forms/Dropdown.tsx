"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  size,
} from "@floating-ui/react";
import DropdownOptionComponent, {
  type DropdownOption,
} from "./DropdownOption";

/**
 * Props for the Dropdown component.
 *
 * @template T - The type of the option's id value (defaults to string)
 */
interface DropdownProps<T = string> {
  /** Array of options to display in the dropdown */
  options: DropdownOption<T>[];
  /** Currently selected value (option id) */
  value?: T;
  /** Callback when an option is selected */
  onChange: (value: T) => void;
  /** Placeholder text shown when no value is selected */
  placeholder?: string;
  /** Enable search functionality in the dropdown */
  searchable?: boolean;
  /** Placeholder text for the search input */
  searchPlaceholder?: string;
  /** Custom filter function for searching options */
  filterFn?: (option: DropdownOption<T>, search: string) => boolean;
  /** Custom render function for option content */
  renderOption?: (option: DropdownOption<T>) => ReactNode;
  /** Additional CSS classes for the trigger button */
  className?: string;
  /** Whether the dropdown is disabled */
  disabled?: boolean;
  /** Label text displayed above the dropdown */
  label?: string;
  /** Error message to display below the dropdown */
  error?: string;
}

/**
 * Default filter function that performs case-insensitive matching
 * against the option's label and description.
 */
const defaultFilterFn = <T,>(
  option: DropdownOption<T>,
  search: string
): boolean => {
  const searchLower = search.toLowerCase();
  return (
    option.label.toLowerCase().includes(searchLower) ||
    (option.description?.toLowerCase().includes(searchLower) ?? false)
  );
};

/**
 * Dropdown Component
 *
 * A flexible dropdown component with search functionality, keyboard navigation,
 * and floating-ui positioning. Supports generic types for type-safe option values.
 *
 * Features:
 * - Optional search input with customizable filtering
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Click outside to close
 * - Floating-UI positioning for proper dropdown placement
 * - Support for icons and descriptions in options
 * - Custom option rendering
 * - Disabled state support
 * - Accessible with proper ARIA attributes
 *
 * @template T - The type of the option's id value (defaults to string)
 *
 * @example
 * ```tsx
 * // Simple dropdown
 * <Dropdown
 *   options={[
 *     { id: 'usd', label: 'US Dollar' },
 *     { id: 'eur', label: 'Euro' }
 *   ]}
 *   value={currency}
 *   onChange={setCurrency}
 *   placeholder="Select currency"
 * />
 *
 * // Searchable dropdown with descriptions
 * <Dropdown
 *   options={[
 *     { id: 'btc', label: 'Bitcoin', description: 'BTC' },
 *     { id: 'eth', label: 'Ethereum', description: 'ETH' }
 *   ]}
 *   value={token}
 *   onChange={setToken}
 *   searchable
 *   searchPlaceholder="Search tokens..."
 * />
 * ```
 */
export default function Dropdown<T = string>({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  searchable = false,
  searchPlaceholder = "Search...",
  filterFn = defaultFilterFn,
  renderOption,
  className = "",
  disabled = false,
  label,
  error,
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Get the currently selected option
  const selectedOption = options.find((opt) => opt.id === value);

  // Filter options based on search
  const filteredOptions = searchable
    ? options.filter((opt) => filterFn(opt, search))
    : options;

  // Set up floating-ui for dropdown positioning
  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(4),
      flip(),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            minWidth: `${rects.reference.width}px`,
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const floatingEl = refs.floating.current as HTMLElement | null;
      const referenceEl = refs.reference.current as HTMLElement | null;

      if (
        floatingEl &&
        referenceEl &&
        !floatingEl.contains(target) &&
        !referenceEl.contains(target)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, refs.floating, refs.reference]);

  // Handle option selection
  const handleSelect = (optionId: T) => {
    onChange(optionId);
    setIsOpen(false);
    setSearch("");
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearch("");
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        ref={(node) => {
          refs.setReference(node);
          triggerRef.current = node;
        }}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left text-sm border rounded-xl bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-blue)] ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-gray-50"
            : "cursor-pointer hover:border-gray-400"
        } ${error ? "border-red-500" : "border-gray-300"} ${className}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedOption?.icon && (
              <span className="flex-shrink-0">{selectedOption.icon}</span>
            )}
            <span
              className={`truncate ${
                selectedOption ? "text-gray-900" : "text-gray-500"
              }`}
            >
              {selectedOption?.label || placeholder}
            </span>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
              isOpen ? "transform rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {/* Dropdown menu */}
      {isOpen && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className="z-50 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
          role="listbox"
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          {searchable && (
            <div className="border-b border-gray-200">
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-500 focus:outline-none"
              />
            </div>
          )}

          {/* Options list */}
          <div className="py-1 max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <DropdownOptionComponent
                  key={String(option.id)}
                  option={option}
                  isSelected={option.id === value}
                  onClick={() => !option.disabled && handleSelect(option.id)}
                  renderOption={renderOption}
                />
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
