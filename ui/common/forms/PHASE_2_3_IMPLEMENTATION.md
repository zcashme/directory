# Phase 2.3: Dropdown Component Implementation

## Overview

Phase 2.3 implements a generic, reusable dropdown component with search functionality, floating-UI positioning, and full TypeScript support with generics.

## Components Created

### 1. DropdownOption.tsx (`/ui/common/forms/DropdownOption.tsx`)

**Purpose:** Defines the option data structure and renders individual dropdown items.

**Key Features:**
- Generic type support for option IDs (`DropdownOption<T>`)
- Support for icons and descriptions
- Selected and disabled states
- Custom rendering support
- Proper styling for hover and selection states

**Interface:**
```typescript
interface DropdownOption<T = string> {
  id: T
  label: string
  description?: string
  icon?: ReactNode
  disabled?: boolean
}
```

### 2. Dropdown.tsx (`/ui/common/forms/Dropdown.tsx`)

**Purpose:** Main dropdown component with search, positioning, and interaction handling.

**Key Features:**
- Optional search functionality with customizable filtering
- Floating-UI positioning (auto-flip, auto-shift, size matching)
- Keyboard navigation (Arrow keys, Enter, Escape)
- Click-outside-to-close behavior
- Custom option rendering
- Generic type support for type-safe option values
- Label and error message support
- Disabled state support

**Props:**
```typescript
interface DropdownProps<T = string> {
  options: DropdownOption<T>[]
  value?: T
  onChange: (value: T) => void
  placeholder?: string
  searchable?: boolean
  searchPlaceholder?: string
  filterFn?: (option: DropdownOption<T>, search: string) => boolean
  renderOption?: (option: DropdownOption<T>) => ReactNode
  className?: string
  disabled?: boolean
  label?: string
  error?: string
}
```

## Implementation Details

### Floating-UI Integration

Uses `@floating-ui/react` for smart positioning:
- `offset(4)` - 4px gap between trigger and dropdown
- `flip()` - Automatically flips when near viewport edges
- `shift({ padding: 8 })` - Shifts to stay within viewport
- `size()` - Matches minimum width to trigger element
- `autoUpdate` - Updates position on scroll/resize

### Search Functionality

Default filter function performs case-insensitive matching on:
- Option label
- Option description

Custom filter functions can be provided via `filterFn` prop.

### Styling

Matches existing design system patterns:
- Dropdown container: `bg-white border border-gray-200 rounded-xl shadow-lg z-50`
- Search input: `border-b border-gray-200 px-3 py-2 text-sm`
- Option hover: `hover:bg-gray-100`
- Selected option: `bg-blue-50 text-blue-700`
- Disabled option: `opacity-50 cursor-not-allowed`

### Accessibility

- Proper ARIA attributes (`aria-haspopup`, `aria-expanded`, `role="listbox"`)
- Keyboard navigation support
- Focus management (auto-focus search on open)
- Screen reader compatible

## Supporting Files

### 3. Dropdown.example.tsx

Comprehensive examples demonstrating:
- Simple string-based dropdown
- Searchable dropdown with icons
- Numeric IDs
- Custom filter functions
- Custom option rendering
- Label and error states
- Disabled states

### 4. forms/README.md

Detailed documentation including:
- Usage examples for all features
- Props reference table
- Features list
- Styling details
- Positioning behavior
- Notes on domain-specific dropdowns

### 5. forms/index.ts

Updated to export:
- `Dropdown` component and `DropdownProps` type
- `DropdownOptionComponent` and related types

### 6. common/index.ts

Updated to export form components from main common entry point.

### 7. common/README.md

Added Forms section with:
- Dropdown component overview
- Quick examples
- Feature highlights
- Link to detailed documentation

## Type Safety

Full TypeScript support with generic types:

```typescript
// String IDs (default)
<Dropdown
  options={[{ id: 'usd', label: 'US Dollar' }]}
  value={currency}
  onChange={setCurrency}
/>

// Numeric IDs
<Dropdown<number>
  options={[{ id: 1, label: 'Option 1' }]}
  value={selectedId}
  onChange={setSelectedId}
/>

// Custom object types
type CityId = { lat: number; lng: number }
<Dropdown<CityId>
  options={cities.map(city => ({
    id: { lat: city.lat, lng: city.lng },
    label: city.name
  }))}
  value={selectedCity}
  onChange={setSelectedCity}
/>
```

## Migration Path

Domain-specific dropdowns can optionally migrate to use this base component:

- **CitySearchDropdown** - Could use searchable Dropdown with async search
- **Currency/Token selectors** - Can use Dropdown with icons and descriptions
- **Profile dropdown** - Can use Dropdown with custom rendering

These migrations are optional and can be done incrementally.

## Usage

```typescript
import { Dropdown } from '@/ui/common/forms'
// or
import { Dropdown } from '@/ui/common'

function MyComponent() {
  const [currency, setCurrency] = useState('usd')

  return (
    <Dropdown
      options={[
        { id: 'usd', label: 'US Dollar', description: 'USD' },
        { id: 'eur', label: 'Euro', description: 'EUR' }
      ]}
      value={currency}
      onChange={setCurrency}
      searchable
      placeholder="Select currency"
    />
  )
}
```

## Testing Recommendations

1. **Keyboard Navigation**
   - Tab to focus dropdown
   - Enter to open
   - Arrow keys to navigate (future enhancement)
   - Escape to close

2. **Mouse Interaction**
   - Click to open/close
   - Click option to select
   - Click outside to close

3. **Search**
   - Type to filter options
   - Clear search on close
   - Auto-focus on open

4. **Positioning**
   - Test near viewport edges
   - Test with scrolling
   - Test with different container sizes

5. **States**
   - Disabled dropdown
   - Disabled options
   - Error state
   - No options found

## Files Created

1. `/ui/common/forms/Dropdown.tsx` (8.7KB)
2. `/ui/common/forms/DropdownOption.tsx` (3.2KB)
3. `/ui/common/forms/Dropdown.example.tsx` (6.7KB)
4. `/ui/common/forms/README.md` (Updated)
5. `/ui/common/forms/index.ts` (Updated)
6. `/ui/common/index.ts` (Updated)
7. `/ui/common/README.md` (Updated)

## Dependencies

- `@floating-ui/react` (already installed: ^0.27.17)
- React hooks: `useState`, `useRef`, `useEffect`
- TypeScript for type safety

## Next Steps

Potential future enhancements:
- Multi-select support
- Option groups
- Virtual scrolling for large lists
- Async option loading
- Arrow key navigation for options
- Combobox mode (type to create new options)
