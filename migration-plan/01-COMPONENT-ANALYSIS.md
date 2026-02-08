# Component Analysis: TypeScript Migration

**File Count**: 62 JSX components in `/ui/` directory
**Estimated Conversion Time**: 15-20 hours
**Parallel Work**: Yes (start with leaf components)

---

## Table of Contents

1. [Component Hierarchy & Dependencies](#component-hierarchy--dependencies)
2. [Prop Patterns & Shared Types](#prop-patterns--shared-types)
3. [Conversion Priority Roadmap](#conversion-priority-roadmap)
4. [Complex Component Patterns](#complex-component-patterns)
5. [Leaf Components (No Dependencies)](#leaf-components-no-dependencies)
6. [Medium Complexity Components](#medium-complexity-components)
7. [High Complexity Components](#high-complexity-components)

---

## Component Hierarchy & Dependencies

### Leaf Components (No Child Dependencies) - CONVERT FIRST

These 12 components have no internal component imports and are safe to migrate first:

```
HelpIcon
├─ Simple state-based tooltip
└─ No child components

ProgressStep
├─ Pure presentational
└─ Animation markers only

ZcashAddressInput
├─ Form input with validation
└─ No child components

StepContainer
├─ Framer Motion wrapper
└─ Animation container

ReferRankBadgeMulti
├─ Rank badge with animation
└─ No child components

LetterGridModal
├─ Letter grid selector
└─ Modal presentation

CopyButton
├─ Clipboard interaction
└─ Button only

AlphabetSidebar
├─ Touch-enabled sidebar
└─ Scroll detection

QrUriBlock
├─ QR code display + copy
└─ No child components

LinkInput
├─ URL validation input
└─ No child components

VerifiedBadge
├─ Animation state
└─ Conditional rendering

HelpMessage
├─ State-based help toggle
└─ No child components
```

### Level 1: Single Dependency Components (18 files)

```
ProfileField
└─ imports: HelpIcon (leaf)

ModalPortal
└─ React DOM direct

AuthExplainerModal
└─ Pure modal presentation

editorModals
└─ imports: ModalPortal

VerifiedCardWrapper
└─ Wrapper with styling

InlineOtpForm
└─ No UI components

SubmitOtp
└─ No UI components

CitySearchDropdown
└─ imports: lib actions

SocialLinkInput
└─ imports: HelpIcon

ProfileAvatar
└─ imports: lib utilities

SocialLinkInput
└─ Form input wrapper

VerifiedCardWrapper
└─ Simple wrapper

AuthExplainerModal
└─ Modal only

[10 more single-dependency components]
```

### Level 2: Dual-Triple Dependency Components (12 files)

```
ProfileSearchDropdown
├─ imports: VerifiedBadge, ProfileAvatar
└─ Search with results display

ProfileCard (COMPLEX)
├─ imports: CopyButton, VerifiedBadge, VerifiedCardWrapper
├─ imports: ReferRankBadgeMulti, ProfileEditor, ProfileAvatar
├─ imports: AuthExplainerModal, SubmitOtp
└─ Card with flip animation

ProfileEditor (COMPLEX)
├─ imports: ProfileField, HelpIcon, editorModals
├─ imports: LinkInput, SocialLinkInput, AuthExplainerModal
├─ imports: CitySearchDropdown
└─ Multi-field editing form

AddUserForm (HIGH COMPLEXITY)
├─ imports: ZcashAddressInput, SocialLinkInput
├─ imports: CitySearchDropdown, StepContainer
├─ imports: VerifiedBadge, ProfileSearchDropdown
└─ Multi-step form

ProfileVerification (COMPLEX)
├─ imports: QrUriBlock, AmountAndWallet, SubmitOtp
├─ imports: InlineOtpForm, ProgressStep, useVerificationPolling
└─ Verification flow

MemoComposer (COMPLEX)
├─ imports: AmountAndWallet, HelpMessage
├─ imports: QrUriBlock, ProfileSearchDropdown
└─ Memo composition

AmountAndWallet (HIGHEST COMPLEXITY)
├─ 60+ dynamic props
├─ Polymorphic behavior
└─ Token/amount/refund handling

SwapComposer & SwapDepositDisplay
├─ imports: AmountAndWallet
└─ Swap display components
```

---

## Prop Patterns & Shared Types

### Common Prop Types (Extract to types/common.ts)

#### Button/Control Props (Used in 8+ components)
```typescript
type ButtonCallback = (e?: React.MouseEvent<HTMLButtonElement>) => void;

type ModalControlProps = {
  isOpen: boolean;
  onClose: () => void;
};

type ButtonProps = {
  onClick?: ButtonCallback;
  disabled?: boolean;
  className?: string;
  title?: string;
};
```

#### Profile-Related Props (Used in 12+ components)
```typescript
type Profile = {
  id: string;
  name: string;
  display_name?: string;
  address: string;
  address_verified?: boolean;
  bio?: string;
  profile_image_url?: string;
  nearest_city_id?: string | null;
  nearest_city_name?: string;
  verified_links_count?: number;
  rank_alltime?: number;
  rank_weekly?: number;
  rank_monthly?: number;
  rank_daily?: number;
  featured?: boolean;
  joined_at?: string;
  created_at?: string;
  since?: string | number;
  last_verified_at?: string;
  last_verified?: string;
  links?: Link[];
  total_links?: number;
  referred_by?: string;
  referred_by_zcasher_id?: string;
};

type Link = {
  id?: string | null;
  url: string;
  label?: string;
  icon?: string | { src: string };
  is_verified?: boolean;
  verification_expires_at?: string | null;
  _uid?: string;
  platform?: string;
  username?: string;
  previewUrl?: string;
  otherUrl?: string;
  valid?: boolean;
  reason?: string | null;
};
```

#### Form Field Props (Used in LinkInput, SocialLinkInput)
```typescript
type FormFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

type ValidationState = {
  valid: boolean;
  reason?: string | null;
};
```

#### Modal/Dropdown Props (7+ components)
```typescript
type DropdownResult<T> = {
  ok: boolean;
  error?: string;
  data?: T[];
};

type SearchDropdownProps = {
  value: string;
  onChange: (value: string | Record<string, any>) => void;
  placeholder?: string;
  loading?: boolean;
  className?: string;
};
```

#### Context State Props (From 4 Providers)
```typescript
// EditsContext
type PendingEdits = {
  profile?: Record<string, any>;
  l?: string[]; // link tokens
  d?: string[]; // deleted fields
  c?: string;   // city token
};

// MessagingContext
type DraftMessage = {
  memo: string;
  amount: string;
};

type VerifyState = {
  memo: string;
  amount: string;
  zId?: string | null;
  requestId?: string | null;
};

// SwapContext (most complex)
type SwapState = {
  originTokenId: string | null;
  swapAmount: string;
  refundAddress: string;
  slippageTolerance: string;
  tokenOptions: Token[];
  quoteData?: any;
  depositUri: string;
  statusKey?: string | null;
  swapStatus: string;
};

type Token = {
  id?: string;
  symbol: string;
  ticker?: string;
  logo?: string;
  chain?: string;
  blockchain?: string;
  label?: string;
};
```

---

## Conversion Priority Roadmap

### Tier 1: Leaf Components (1-2 hours)
```
1. HelpIcon
2. ProgressStep
3. ZcashAddressInput
4. StepContainer
5. ReferRankBadgeMulti
6. LetterGridModal
7. CopyButton
8. AlphabetSidebar
9. QrUriBlock
10. LinkInput
11. VerifiedBadge
12. HelpMessage
```

**Work**: Extract prop interfaces, add React.ReactNode typing
**Dependencies**: None
**Deliverable**: 12 .tsx files with typed props

---

### Tier 2: Single/Dual Dependency Components (3-4 hours)
```
13. ModalPortal
14. ProfileField (depends on HelpIcon)
15. AuthExplainerModal
16. editorModals (depends on ModalPortal)
17. VerifiedCardWrapper
18. InlineOtpForm
19. SubmitOtp
20. CitySearchDropdown
21. SocialLinkInput (depends on HelpIcon)
22. ProfileAvatar
23-30. [8 more with single deps]
```

**Work**: Type component props, context usage, callbacks
**Dependencies**: Tier 1 components
**Deliverable**: 18 .tsx files with full prop typing

---

### Tier 3: Complex Composed Components (8-10 hours)
```
ProfileSearchDropdown
├─ Depends: VerifiedBadge, ProfileAvatar (both Tier 1/2)
├─ Search with result display
└─ Time: 1-2 hours

ProfileCard
├─ Depends: 8 child components
├─ Complex: flip animation, conditional rendering
└─ Time: 2-3 hours

ProfileEditor
├─ Depends: Multiple inputs and modals
├─ Complex: form state, validation
└─ Time: 2-3 hours

AmountAndWallet
├─ Depends: No children
├─ Complex: 60+ props, polymorphic behavior
└─ Time: 2 hours

AddUserForm
├─ Depends: ZcashAddressInput, SocialLinkInput, etc.
├─ Complex: Multi-step form
└─ Time: 2 hours

ProfileVerification & MemoComposer & Others
├─ Similar complexity to above
└─ Time: 2-3 hours each
```

**Work**: Union types for polymorphic props, complex state
**Dependencies**: Tier 1 & 2 components
**Deliverable**: 12 .tsx files with complex typing

---

## Complex Component Patterns

### Pattern 1: Polymorphic Props (ProfileCard, AmountAndWallet)

**Example: ProfileCard**
```typescript
interface ProfileCardProps {
  profile: Profile;
  onSelect?: (profile: Profile) => void;
  warning?: WarningConfig;
  fullView?: boolean;           // Changes entire behavior
  duplicateNameCount?: number;
  feedbackProps?: {
    setForceShowQR?: (val: number) => void;
    pendingEdits?: PendingEdits;
    setPendingEdits?: (key: string, val: any) => void;
  };
}

// Renders differently based on fullView prop
// front side vs back side with ProfileEditor
```

**Strategy**: Create separate interfaces for each variant, use discriminated unions if needed.

---

### Pattern 2: Callback Props with Specific Signatures

**Example: Profile Editor Callbacks**
```typescript
type ProfileEditorCallbacks = {
  setPendingEdits: (field: string, value: any) => void;
  // Used as: setPendingEdits("profile", {...})
  //          setPendingEdits("l", [...])
};

type LinkOperationCallback = (uid: string, value: string) => void;
// handleLinkChange(uid, value)
// handleSocialLinkChange(uid, value)

type DeleteCallback = (e: React.MouseEvent | React.ChangeEvent) => void;
```

**Strategy**: Extract callback types, document expected signatures with comments.

---

### Pattern 3: Children Props with JSX Children

**Example: ModalPortal, ProfileField**
```typescript
interface ModalPortalProps {
  children: React.ReactNode;
}

interface ProfileFieldProps {
  children: React.ReactNode;
  label: string;
  htmlFor?: string;
  helpText: string;
  deletePopup?: React.ReactNode;  // Optional JSX child
}
```

**Strategy**: Use React.ReactNode for composition, React.ReactElement<T> for specific component types.

---

### Pattern 4: Context Consumption (ProfileCard, ProfileEditor)

**Example: Using multiple contexts**
```typescript
function ProfileCard(props: ProfileCardProps) {
  const { forceShowQR, setForceShowQR } = useSelection();
  const { pendingEdits, setPendingEdits } = useEdits();
  const { mode, setMode } = useMessaging();
  const { swapStatus } = useSwap();

  // Component implementation
}
```

**Strategy**: Create typed hooks for each context, validate context exists.

---

### Pattern 5: Framer Motion Animation Props

**Example: StepContainer, VerifiedBadge**
```typescript
import { motion, AnimatePresence } from "framer-motion";

interface StepContainerProps {
  children: React.ReactNode;
  stepKey: string;
  dir: number;  // 1 or -1 for direction
}

function StepContainer({ children, stepKey, dir }: StepContainerProps) {
  return (
    <motion.div
      key={stepKey}
      initial={{ x: dir * 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -dir * 100, opacity: 0 }}
    >
      {children}
    </motion.div>
  );
}
```

**Strategy**: Framer Motion is already well-typed, just annotate React.ReactNode children.

---

## Leaf Components (No Dependencies)

These are the safest to convert first. Extract prop interfaces from JSDoc comments.

### HelpIcon
```typescript
interface HelpIconProps {
  helpText: string;
  className?: string;
}

export function HelpIcon({ helpText, className }: HelpIconProps) {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  // ...
}
```

### ProgressStep
```typescript
interface ProgressStepProps {
  step: number;
  isActive: boolean;
  label?: string;
}

export function ProgressStep({ step, isActive, label }: ProgressStepProps) {
  // Pure presentational
}
```

### ZcashAddressInput
```typescript
interface ZcashAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ZcashAddressInput(props: ZcashAddressInputProps) {
  // Input with validation
}
```

### [Continue pattern for remaining 9 leaf components...]

---

## Medium Complexity Components

### ProfileField (Depends: HelpIcon)
```typescript
interface ProfileFieldProps {
  children: React.ReactNode;
  label: string;
  htmlFor?: string;
  helpText: string;
  deletePopup?: React.ReactNode;
  onDelete?: () => void;
}

export function ProfileField({
  children,
  label,
  htmlFor,
  helpText,
  deletePopup,
  onDelete,
}: ProfileFieldProps) {
  return (
    <div className="profile-field">
      <label htmlFor={htmlFor}>
        {label}
        <HelpIcon helpText={helpText} />
      </label>
      {children}
      {deletePopup && <button onClick={onDelete}>{deletePopup}</button>}
    </div>
  );
}
```

### CitySearchDropdown (Depends: Supabase action)
```typescript
interface CitySearchDropdownProps {
  value: string;
  onChange: (city: { id: number; city_ascii: string }) => void;
  placeholder?: string;
  loading?: boolean;
}

export function CitySearchDropdown(props: CitySearchDropdownProps) {
  const [results, setResults] = useState<City[]>([]);
  // Uses searchCitiesAction from lib
}
```

### [Continue for remaining medium complexity components...]

---

## High Complexity Components

### AmountAndWallet (60+ dynamic props)
```typescript
interface AmountAndWalletProps {
  // Amount and wallet
  amount: string;
  setAmount: (val: string) => void;
  openWallet: () => void;
  openWalletLabel?: string;
  showOpenWallet?: boolean;
  showUsdPill?: boolean;
  showRateMessage?: boolean;

  // Token selector (optional)
  asset?: string;
  assetOptions?: Token[];
  setAsset?: (tokenId: string) => void;

  // Refund address (optional)
  showRefund?: boolean;
  refundAddress?: string;
  setRefundAddress?: (addr: string) => void;

  tokenBlockchain?: string;
}

export function AmountAndWallet(props: AmountAndWalletProps) {
  // Complex component with multiple optional behaviors
  // Render conditionally based on prop combinations
}
```

**Strategy**: Break into smaller sub-components or use discriminated union for variants.

---

### ProfileCard (8 child dependencies, flip animation)
```typescript
interface ProfileCardProps {
  profile: Profile;
  onSelect?: (profile: Profile) => void;
  warning?: WarningConfig;
  fullView?: boolean;
  duplicateNameCount?: number;
  feedbackProps?: {
    setForceShowQR?: (val: number) => void;
    pendingEdits?: PendingEdits;
    setPendingEdits?: (key: string, val: any) => void;
  };
}

export function ProfileCard({
  profile,
  onSelect,
  warning,
  fullView = false,
  duplicateNameCount,
  feedbackProps,
}: ProfileCardProps) {
  const [showBack, setShowBack] = useState(false);
  const { forceShowQR, setForceShowQR } = useSelection();

  return (
    <motion.div
      onClick={() => setShowBack(!showBack)}
      animate={{ rotateY: showBack ? 180 : 0 }}
    >
      <AnimatePresence mode="wait">
        {showBack ? (
          <ProfileEditor key="back" {...feedbackProps} />
        ) : (
          <FrontCard key="front" profile={profile} warning={warning} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

---

### ProfileEditor (Multiple inputs, validation)
```typescript
interface ProfileEditorProps {
  profile: Profile;
  setForceShowQR?: (val: number) => void;
  pendingEdits?: PendingEdits;
  setPendingEdits?: (key: string, val: any) => void;
}

export function ProfileEditor({
  profile,
  setForceShowQR,
  pendingEdits,
  setPendingEdits,
}: ProfileEditorProps) {
  const { editChangesRequested, setEditChangesRequested } = useEdits();

  return (
    <form>
      <ProfileField label="Name" helpText="...">
        <input
          value={pendingEdits?.profile?.name || profile.name}
          onChange={(e) =>
            setPendingEdits?.("profile", { name: e.target.value })
          }
        />
      </ProfileField>

      <ProfileField label="Links" helpText="...">
        <LinkInput {...linkProps} />
      </ProfileField>

      <ProfileField label="Social" helpText="...">
        <SocialLinkInput {...socialProps} />
      </ProfileField>
    </form>
  );
}
```

---

## Custom Hooks in Components

If components use custom hooks, they should also be typed:

```typescript
// In component
const { forceShowQR, setForceShowQR } = useSelection();

// Hook definition
function useSelection(): SelectionContextType {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error("useSelection must be used within SelectionProvider");
  }
  return context;
}

// Type definition
interface SelectionContextType {
  forceShowQR: boolean;
  setForceShowQR: (value: boolean) => void;
}
```

---

## Type Files to Create

Create in `/types/` directory:

### types/common.ts
```typescript
export type ButtonCallback = (e?: React.MouseEvent<HTMLButtonElement>) => void;
export type FormFieldProps = { ... };
export type ModalControlProps = { ... };
// [10+ shared prop types]
```

### types/profile.ts
```typescript
export type Profile = { ... };
export type Link = { ... };
export type WarningConfig = { ... };
export type ProfileTrust = { ... };
// [profile-related types]
```

### types/swap.ts
```typescript
export type Token = { ... };
export type SwapState = { ... };
export type AmountAndWalletProps = { ... };
// [swap-related types]
```

### types/contexts.ts
```typescript
export type SelectionContextType = { ... };
export type EditsContextType = { ... };
export type MessagingContextType = { ... };
export type SwapContextType = { ... };
// [context types]
```

---

## Estimated Time per Component

| Component | Type | Time | Dependencies |
|-----------|------|------|--------------|
| HelpIcon | Leaf | 15m | None |
| ProgressStep | Leaf | 15m | None |
| ZcashAddressInput | Leaf | 30m | Validation |
| StepContainer | Leaf | 15m | Framer Motion |
| [8 more leaf] | Leaf | 2h | None |
| ProfileField | L1 | 20m | HelpIcon |
| ModalPortal | L1 | 15m | React DOM |
| [16 more L1] | L1 | 2.5h | Various |
| ProfileCard | L3 | 2-3h | 8 children |
| ProfileEditor | L3 | 2-3h | Multiple |
| AmountAndWallet | L3 | 2h | Polymorphic |
| AddUserForm | L3 | 2h | Multiple |
| [8 more L3] | L3 | 5-7h | Various |
| **TOTAL** | | **15-20h** | |

---

## Key Takeaways

1. **Start with leaf components** - No dependencies means fast conversions
2. **Create shared types early** - types/common.ts, types/profile.ts
3. **Use interfaces for props** - Extract from JSDoc comments
4. **Type callbacks explicitly** - `(value: string) => void` not `(...args: any[])`
5. **Discriminated unions** - For components with multiple rendering modes
6. **Context hooks must exist** - Export typed hooks alongside providers
7. **Test incrementally** - Convert tier by tier, build after each tier

---

## Next Steps

1. Create type definition files (types/*.ts)
2. Convert Tier 1 leaf components (quick wins)
3. Convert Tier 2 components (depends on Tier 1)
4. Convert Tier 3 components (most complex)
5. Update context providers to use typed components
6. Build and test

**Move to**: `02-LIBRARY-ANALYSIS.md` for utility conversion
**Or**: Start implementing Phase 2 components now!

---

Generated: 2026-02-08
Related: Types in Phase 1, Components in Phase 2
