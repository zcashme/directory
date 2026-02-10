# Form Components

Reusable form components with consistent styling and behavior.

## Components

### Dropdown (Phase 2.3)

A flexible dropdown component with search functionality and floating-UI positioning.

**Added in:** Phase 2.3 - Dropdown Component

#### Basic Usage

```tsx
import { Dropdown } from '@/ui/common/forms'

function MyComponent() {
  const [currency, setCurrency] = useState('usd')

  return (
    <Dropdown
      options={[
        { id: 'usd', label: 'US Dollar', description: 'USD' },
        { id: 'eur', label: 'Euro', description: 'EUR' },
        { id: 'gbp', label: 'British Pound', description: 'GBP' }
      ]}
      value={currency}
      onChange={setCurrency}
      placeholder="Select currency"
    />
  )
}
```

#### With Search

```tsx
<Dropdown
  options={tokenOptions}
  value={token}
  onChange={setToken}
  searchable
  searchPlaceholder="Search tokens..."
  placeholder="Select a token"
/>
```

#### With Icons

```tsx
<Dropdown
  options={[
    {
      id: 'btc',
      label: 'Bitcoin',
      description: 'BTC',
      icon: <img src="/btc.png" className="w-5 h-5" />
    },
    {
      id: 'eth',
      label: 'Ethereum',
      description: 'ETH',
      icon: <img src="/eth.png" className="w-5 h-5" />
    }
  ]}
  value={crypto}
  onChange={setCrypto}
  searchable
/>
```

#### Custom Filter Function

```tsx
<Dropdown
  options={countries}
  value={country}
  onChange={setCountry}
  searchable
  filterFn={(option, search) => {
    const searchLower = search.toLowerCase()
    return (
      option.label.toLowerCase().includes(searchLower) ||
      option.id.toLowerCase().includes(searchLower)
    )
  }}
/>
```

#### Custom Option Rendering

```tsx
<Dropdown
  options={users}
  value={userId}
  onChange={setUserId}
  renderOption={(option) => (
    <div className="flex items-center gap-2">
      <img src={option.avatar} className="w-6 h-6 rounded-full" />
      <div>
        <div className="font-medium">{option.label}</div>
        <div className="text-xs text-gray-500">{option.email}</div>
      </div>
    </div>
  )}
/>
```

#### With Label and Error

```tsx
<Dropdown
  label="Country"
  options={countryOptions}
  value={country}
  onChange={setCountry}
  error={errors.country}
  placeholder="Select your country"
/>
```

#### Generic Types

```tsx
// Numeric IDs
interface NumericOption extends DropdownOption<number> {
  id: number
  label: string
}

<Dropdown<number>
  options={[
    { id: 1, label: 'Option 1' },
    { id: 2, label: 'Option 2' }
  ]}
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

## Props

### DropdownProps<T>

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `DropdownOption<T>[]` | required | Array of options to display |
| `value` | `T` | `undefined` | Currently selected value |
| `onChange` | `(value: T) => void` | required | Callback when selection changes |
| `placeholder` | `string` | `"Select an option"` | Placeholder text |
| `searchable` | `boolean` | `false` | Enable search functionality |
| `searchPlaceholder` | `string` | `"Search..."` | Search input placeholder |
| `filterFn` | `(option, search) => boolean` | default filter | Custom filter function |
| `renderOption` | `(option) => ReactNode` | default render | Custom option renderer |
| `className` | `string` | `""` | Additional CSS classes |
| `disabled` | `boolean` | `false` | Disable the dropdown |
| `label` | `string` | `undefined` | Label above dropdown |
| `error` | `string` | `undefined` | Error message below dropdown |

### DropdownOption<T>

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `T` | ✓ | Unique identifier |
| `label` | `string` | ✓ | Display label |
| `description` | `string` | - | Additional description |
| `icon` | `ReactNode` | - | Icon element |
| `disabled` | `boolean` | - | Disable option |

## Features

- **Search**: Optional search input with customizable filtering
- **Keyboard Navigation**: Arrow keys, Enter, and Escape support
- **Click Outside**: Automatically closes on outside click
- **Floating-UI**: Smart positioning that adapts to viewport
- **Icons**: Support for icons and images in options
- **Descriptions**: Optional description text for each option
- **Custom Rendering**: Full control over option appearance
- **Type-Safe**: Generic types for type-safe option values
- **Accessible**: Proper ARIA attributes and keyboard support
- **Disabled States**: Support for disabled options and disabled dropdown

## Styling

The component uses Tailwind CSS classes matching the existing design system:

- Dropdown container: `bg-white border rounded-xl shadow-lg z-50`
- Search input: `border-b px-3 py-2 text-sm`
- Option hover: `hover:bg-gray-100`
- Selected option: `bg-blue-50 text-blue-700`
- Disabled option: `opacity-50 cursor-not-allowed`

## Positioning

Uses `@floating-ui/react` for smart dropdown positioning:

- Automatically flips when near viewport edges
- Shifts to stay within viewport
- Matches trigger width (minimum)
- Updates position on scroll/resize

## Domain-Specific Dropdowns

For specialized use cases, keep domain-specific implementations:

- `CitySearchDropdown` - Location search with API integration
- `ProfileDropdown` - User profile menu
- Currency/Token selectors in verification flows

These can optionally migrate to use the base Dropdown component in future iterations.

---

## Phase 2.1: Input Components

### Input

Base text input component with validation states and sizing options.

#### Basic Usage

```tsx
import { Input } from '@/ui/common/forms'

function MyForm() {
  const [email, setEmail] = useState('')

  return (
    <Input
      value={email}
      onChange={setEmail}
      type="email"
      placeholder="Enter your email"
    />
  )
}
```

#### With Validation

```tsx
<Input
  value={url}
  onChange={setUrl}
  type="url"
  validate={(val) => {
    const urlPattern = /^https?:\/\/.+/
    return {
      valid: urlPattern.test(val),
      reason: !urlPattern.test(val) ? "Must be a valid URL" : null
    }
  }}
  showValidation
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | required | Current input value |
| `onChange` | `(value: string) => void` | required | Callback when value changes |
| `type` | `"text" \| "email" \| "url" \| "number" \| "tel" \| "password" \| "search"` | `"text"` | Input type |
| `error` | `boolean` | `false` | Error state |
| `errorMessage` | `string` | - | Error message to display |
| `infoMessage` | `string` | - | Info message to display |
| `validate` | `(value: string) => { valid: boolean; reason?: string \| null }` | - | Custom validation function |
| `showValidation` | `boolean` | `false` | Whether to show validation messages |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Input size |

---

### TextArea

Multi-line text input component with validation states.

#### Basic Usage

```tsx
import { TextArea } from '@/ui/common/forms'

function MyForm() {
  const [bio, setBio] = useState('')

  return (
    <TextArea
      value={bio}
      onChange={setBio}
      placeholder="Tell us about yourself"
      rows={4}
    />
  )
}
```

---

### Select

Native select dropdown component with consistent styling.

#### Basic Usage

```tsx
import { Select } from '@/ui/common/forms'

function MyForm() {
  const [country, setCountry] = useState('')

  return (
    <Select
      value={country}
      onChange={setCountry}
      options={[
        { value: '', label: 'Select a country' },
        { value: 'us', label: 'United States' },
        { value: 'ca', label: 'Canada' }
      ]}
    />
  )
}
```

---

### Checkbox

Checkbox component with label and flexible positioning.

#### Basic Usage

```tsx
import { Checkbox } from '@/ui/common/forms'

function MyForm() {
  const [agreed, setAgreed] = useState(false)

  return (
    <Checkbox
      checked={agreed}
      onChange={setAgreed}
      label="I agree to the terms and conditions"
    />
  )
}
```

---

### FormField

Form field wrapper component providing consistent layout with label, help text, and error display.

#### Basic Usage

```tsx
import { FormField, Input } from '@/ui/common/forms'

function MyForm() {
  const [email, setEmail] = useState('')

  return (
    <FormField
      label="Email Address"
      htmlFor="email"
      helpText="We'll never share your email with anyone else"
      required
    >
      <Input
        id="email"
        type="email"
        value={email}
        onChange={setEmail}
      />
    </FormField>
  )
}
```

---

## Complete Form Example

```tsx
import { FormField, Input, TextArea, Select, Checkbox } from '@/ui/common/forms'

function RegistrationForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    bio: '',
    country: '',
    agreeToTerms: false
  })

  return (
    <form>
      <FormField
        label="Email"
        htmlFor="email"
        helpText="Your email address for login"
        required
      >
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(val) => setFormData({ ...formData, email: val })}
          placeholder="you@example.com"
        />
      </FormField>

      <FormField
        label="Password"
        htmlFor="password"
        helpText="Must be at least 8 characters"
        required
      >
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(val) => setFormData({ ...formData, password: val })}
          validate={(val) => ({
            valid: val.length >= 8,
            reason: val.length < 8 ? "Password must be at least 8 characters" : null
          })}
          showValidation
        />
      </FormField>

      <FormField
        label="Bio"
        htmlFor="bio"
        helpText="Tell us about yourself"
      >
        <TextArea
          id="bio"
          value={formData.bio}
          onChange={(val) => setFormData({ ...formData, bio: val })}
          rows={4}
          placeholder="A few words about you..."
        />
      </FormField>

      <FormField
        label="Country"
        htmlFor="country"
        helpText="Your country of residence"
        required
      >
        <Select
          id="country"
          value={formData.country}
          onChange={(val) => setFormData({ ...formData, country: val })}
          options={[
            { value: '', label: 'Select a country' },
            { value: 'us', label: 'United States' },
            { value: 'ca', label: 'Canada' }
          ]}
        />
      </FormField>

      <Checkbox
        checked={formData.agreeToTerms}
        onChange={(val) => setFormData({ ...formData, agreeToTerms: val })}
        label="I agree to the terms and conditions"
      />

      <button type="submit">Register</button>
    </form>
  )
}
```

## Border States

All input components support consistent border states:

- **Normal**: `border-black/30` - Default state
- **Focus**: `border-blue-600` - When input has focus
- **Error**: `border-red-400` with `focus:border-red-500` - When validation fails
- **Info**: `border-blue-400` with `focus:border-blue-500` - When showing info message
- **Readonly/Disabled**: `border-black/40 bg-gray-100` - Non-editable state

## Size Classes

Consistent sizing across all input components:

- **sm**: `text-sm px-3 py-1.5` - Compact for inline forms
- **md**: `text-sm px-3 py-2` - Default size
- **lg**: `text-base px-4 py-2.5` - Larger for emphasis
