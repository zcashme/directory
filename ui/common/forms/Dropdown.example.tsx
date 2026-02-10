/**
 * Dropdown Component Examples
 *
 * This file contains example usage patterns for the Dropdown component.
 * These examples demonstrate various features and configurations.
 */

"use client";

import { useState } from "react";
import Dropdown from "./Dropdown";
import type { DropdownOption } from "./DropdownOption";

// Example 1: Simple string-based dropdown
export function SimpleDropdownExample() {
  const [currency, setCurrency] = useState("usd");

  const currencyOptions: DropdownOption[] = [
    { id: "usd", label: "US Dollar", description: "USD" },
    { id: "eur", label: "Euro", description: "EUR" },
    { id: "gbp", label: "British Pound", description: "GBP" },
    { id: "jpy", label: "Japanese Yen", description: "JPY" },
  ];

  return (
    <div className="w-64">
      <Dropdown
        options={currencyOptions}
        value={currency}
        onChange={setCurrency}
        placeholder="Select currency"
      />
    </div>
  );
}

// Example 2: Searchable dropdown with icons
export function SearchableDropdownExample() {
  const [token, setToken] = useState<string>();

  const tokenOptions: DropdownOption[] = [
    {
      id: "btc",
      label: "Bitcoin",
      description: "BTC",
      icon: (
        <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
          ₿
        </div>
      ),
    },
    {
      id: "eth",
      label: "Ethereum",
      description: "ETH",
      icon: (
        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
          Ξ
        </div>
      ),
    },
    {
      id: "zec",
      label: "Zcash",
      description: "ZEC",
      icon: (
        <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
          Z
        </div>
      ),
    },
  ];

  return (
    <div className="w-64">
      <Dropdown
        options={tokenOptions}
        value={token}
        onChange={setToken}
        searchable
        searchPlaceholder="Search tokens..."
        placeholder="Select a token"
      />
    </div>
  );
}

// Example 3: Dropdown with numeric IDs
export function NumericIdDropdownExample() {
  const [selectedId, setSelectedId] = useState<number>();

  const numericOptions: DropdownOption<number>[] = [
    { id: 1, label: "Option 1", description: "First option" },
    { id: 2, label: "Option 2", description: "Second option" },
    { id: 3, label: "Option 3", description: "Third option" },
  ];

  return (
    <div className="w-64">
      <Dropdown<number>
        options={numericOptions}
        value={selectedId}
        onChange={setSelectedId}
        placeholder="Select an option"
      />
    </div>
  );
}

// Example 4: Dropdown with custom filter function
export function CustomFilterDropdownExample() {
  const [country, setCountry] = useState<string>();

  const countryOptions: DropdownOption[] = [
    { id: "us", label: "United States", description: "North America" },
    { id: "uk", label: "United Kingdom", description: "Europe" },
    { id: "jp", label: "Japan", description: "Asia" },
    { id: "au", label: "Australia", description: "Oceania" },
  ];

  // Custom filter that searches both label and id
  const customFilter = (option: DropdownOption, search: string) => {
    const searchLower = search.toLowerCase();
    return (
      option.label.toLowerCase().includes(searchLower) ||
      option.id.toLowerCase().includes(searchLower) ||
      (option.description?.toLowerCase().includes(searchLower) ?? false)
    );
  };

  return (
    <div className="w-64">
      <Dropdown
        options={countryOptions}
        value={country}
        onChange={setCountry}
        searchable
        filterFn={customFilter}
        placeholder="Select country"
      />
    </div>
  );
}

// Example 5: Dropdown with custom option rendering
export function CustomRenderDropdownExample() {
  const [user, setUser] = useState<string>();

  interface UserOption extends DropdownOption {
    email?: string;
    avatar?: string;
  }

  const userOptions: UserOption[] = [
    {
      id: "1",
      label: "John Doe",
      email: "john@example.com",
      avatar: "👤",
    },
    {
      id: "2",
      label: "Jane Smith",
      email: "jane@example.com",
      avatar: "👤",
    },
  ];

  return (
    <div className="w-64">
      <Dropdown
        options={userOptions}
        value={user}
        onChange={setUser}
        renderOption={(option) => {
          const userOption = option as UserOption;
          return (
            <div className="flex items-center gap-2">
              <span className="text-2xl">{userOption.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{option.label}</div>
                <div className="text-xs text-gray-500 truncate">
                  {userOption.email}
                </div>
              </div>
            </div>
          );
        }}
        placeholder="Select user"
      />
    </div>
  );
}

// Example 6: Dropdown with label and error
export function LabeledDropdownExample() {
  const [category, setCategory] = useState<string>();
  const [error, setError] = useState<string>();

  const categoryOptions: DropdownOption[] = [
    { id: "tech", label: "Technology" },
    { id: "health", label: "Healthcare" },
    { id: "finance", label: "Finance" },
  ];

  const handleSubmit = () => {
    if (!category) {
      setError("Please select a category");
    } else {
      setError(undefined);
      // Handle submit
    }
  };

  return (
    <div className="w-64 space-y-4">
      <Dropdown
        label="Category"
        options={categoryOptions}
        value={category}
        onChange={(val) => {
          setCategory(val);
          setError(undefined);
        }}
        error={error}
        placeholder="Select a category"
      />
      <button
        onClick={handleSubmit}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Submit
      </button>
    </div>
  );
}

// Example 7: Disabled dropdown
export function DisabledDropdownExample() {
  const options: DropdownOption[] = [
    { id: "1", label: "Option 1" },
    { id: "2", label: "Option 2", disabled: true },
    { id: "3", label: "Option 3" },
  ];

  return (
    <div className="w-64 space-y-4">
      <Dropdown
        options={options}
        value="1"
        onChange={() => {}}
        placeholder="Select option"
        disabled
        label="Disabled Dropdown"
      />

      <Dropdown
        options={options}
        onChange={() => {}}
        placeholder="Enabled with disabled option"
        label="Options with disabled items"
      />
    </div>
  );
}
