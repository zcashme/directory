# OTP Components Consolidation Plan
**Phase 4.1: Extract Shared Logic into Reusable Hooks and Components**

---

## Executive Summary

This document outlines the plan to consolidate duplicate OTP verification logic from `SubmitOtp.tsx` (309 lines) and `InlineOtpForm.tsx` (122 lines) into shared, reusable hooks and components. The consolidation will extract ~150 lines of duplicated logic into centralized, tested, and maintainable modules.

**Target Deliverables:**
1. `useOtpFlow.ts` - State machine hook (~80 lines)
2. `OtpInput.tsx` - Reusable input component (~50 lines)
3. `otpMessages.ts` - Centralized status message constants (~40 lines)

**Key Benefits:**
- **Single Source of Truth**: One state machine implementation for all OTP flows
- **Consistency**: Identical validation, error handling, and messaging across all UI variants
- **Maintainability**: Bug fixes and enhancements apply to all consumers automatically
- **Testability**: Isolated hooks and components are easier to unit test
- **Developer Experience**: Clear interfaces and well-documented APIs

---

## Current State Analysis

### Common Patterns Identified

#### 1. State Machine Structure (IDENTICAL in both files)
```typescript
// Three-step flow: ENTRY → CHECKING → RESULT
const STEPS = {
  ENTRY: 0,
  CHECKING: 1,
  RESULT: 2,
} as const;

type Step = typeof STEPS[keyof typeof STEPS];
type ResultType = "ok" | "fail";
```

#### 2. OTP Input Validation (IDENTICAL logic)
```typescript
// Both components strip non-digits:
onChange={(e) => {
  const onlyDigits = e.target.value.replace(/\D+/g, "");
  setOtp(onlyDigits);
}}
```

#### 3. Status Message Mapping (NEARLY IDENTICAL)

**SubmitOtp.tsx** (Lines 18-43):
```typescript
const OTP_MESSAGES: Record<string, { type: ResultType; text: string }> = {
  verified: {
    type: "ok",
    text: "Your profile has been updated. Close to refresh the page.",
  },
  verified_and_no_pending_edits: {
    type: "ok",
    text: "Your address is verified, but there were no changes to apply.",
  },
  invalid: { type: "fail", text: "Incorrect code. Please try again." },
  locked: { type: "fail", text: "Too many failed attempts. This OTP is now locked." },
  expired: { type: "fail", text: "This OTP has expired. Request a new one." },
  otp_already_used: { type: "fail", text: "This OTP was already used. Generate a new one." },
};
```

**InlineOtpForm.tsx** (Lines 36-47):
```typescript
// Inline conditionals with IDENTICAL messages:
if (status === "verified" || status === "verified_and_no_pending_edits") {
  setMessage("OTP accepted. Page will refresh shortly.");
}
if (status === "invalid") failMsg = "Incorrect code. Please try again.";
else if (status === "locked") failMsg = "Too many failed attempts. This OTP is now locked.";
else if (status === "expired") failMsg = "This OTP has expired. Request a new one.";
else if (status === "otp_already_used") failMsg = "This OTP was already used. Generate a new one.";
```

#### 4. Server Action Integration (IDENTICAL flow)
```typescript
// Both use confirmOtpAction with same error handling pattern
const response = await confirmOtpAction(zid, otp.trim());
if (!response.ok) {
  showResult("fail", response.error || "Unexpected server error.");
  return;
}
const status = response.data?.status;
const statusInfo = status ? OTP_MESSAGES[status] : null;
if (statusInfo) {
  showResult(statusInfo.type, statusInfo.text);
}
```

#### 5. State Management (IDENTICAL variables and transitions)
```typescript
const [step, setStep] = useState<Step>(STEPS.ENTRY);
const [otp, setOtp] = useState("");
const [result, setResult] = useState<ResultType | null>(null);
const [message, setMessage] = useState("");
```

---

## Detailed Design: Extracted Modules

### 1. `useOtpFlow.ts` - State Machine Hook

**Location:** `/Users/jules/Sites/directory/ui/verification/hooks/useOtpFlow.ts`

**Purpose:** Encapsulates the entire OTP verification state machine, providing a clean interface for any UI component to integrate OTP submission logic.

**Interface Definition:**
```typescript
import type { Profile } from "@/lib/profile/types";

export type OtpStep = "ENTRY" | "CHECKING" | "RESULT";
export type OtpResultType = "ok" | "fail";

export interface OtpFlowState {
  // Current state machine step
  step: OtpStep;

  // User input
  otp: string;

  // Result state
  result: OtpResultType | null;
  message: string;

  // Loading state
  isSubmitting: boolean;
}

export interface OtpFlowActions {
  // Update OTP value (automatically strips non-digits)
  setOtp: (value: string) => void;

  // Submit OTP for verification
  submitOtp: () => Promise<void>;

  // Reset to initial state
  reset: () => void;

  // Navigate back to entry from result screen
  retry: () => void;
}

export interface UseOtpFlowOptions {
  // Profile to verify
  profile: Partial<Profile>;

  // Callback on successful verification
  onSuccess?: (data: { status: string; message: string }) => void;

  // Callback on any result (success or failure)
  onResult?: (result: OtpResultType, message: string, status?: string) => void;
}

export interface UseOtpFlowReturn {
  state: OtpFlowState;
  actions: OtpFlowActions;
}

export function useOtpFlow(options: UseOtpFlowOptions): UseOtpFlowReturn;
```

**Internal Implementation Strategy:**
```typescript
// Core state machine logic (lines ~20-40)
const [step, setStep] = useState<OtpStep>("ENTRY");
const [otp, setOtpValue] = useState("");
const [result, setResult] = useState<OtpResultType | null>(null);
const [message, setMessage] = useState("");
const [isSubmitting, setIsSubmitting] = useState(false);

// setOtp: Strip non-digits automatically
const setOtp = useCallback((value: string) => {
  const onlyDigits = value.replace(/\D+/g, "");
  setOtpValue(onlyDigits);
}, []);

// submitOtp: Full verification flow
const submitOtp = useCallback(async () => {
  const zid = options.profile?.id;
  if (!zid || !otp.trim()) return;

  setIsSubmitting(true);
  setStep("CHECKING");

  try {
    const response = await confirmOtpAction(zid, otp.trim());

    if (!response.ok) {
      const errorMsg = response.error || "Unexpected server error.";
      setResult("fail");
      setMessage(errorMsg);
      setStep("RESULT");
      options.onResult?.("fail", errorMsg);
      return;
    }

    const status = response.data?.status;
    const statusMessage = getOtpMessage(status);

    setResult(statusMessage.type);
    setMessage(statusMessage.text);
    setStep("RESULT");

    if (statusMessage.type === "ok") {
      options.onSuccess?.({ status: status || "verified", message: statusMessage.text });
    }

    options.onResult?.(statusMessage.type, statusMessage.text, status);
  } catch (error) {
    const errorMsg = "Unexpected error.";
    setResult("fail");
    setMessage(errorMsg);
    setStep("RESULT");
    options.onResult?.("fail", errorMsg);
  } finally {
    setIsSubmitting(false);
  }
}, [otp, options]);

// reset: Clear all state
const reset = useCallback(() => {
  setStep("ENTRY");
  setOtpValue("");
  setResult(null);
  setMessage("");
  setIsSubmitting(false);
}, []);

// retry: Back to entry from result
const retry = useCallback(() => {
  setStep("ENTRY");
  setOtpValue("");
  setResult(null);
  setMessage("");
}, []);

return {
  state: { step, otp, result, message, isSubmitting },
  actions: { setOtp, submitOtp, reset, retry },
};
```

**Key Design Decisions:**
- **Separation of State and Actions**: Explicit `state` and `actions` objects for clarity
- **Automatic Digit Stripping**: Built into `setOtp` action (no need for consumers to remember)
- **Callbacks for Integration**: `onSuccess` and `onResult` allow UI-specific side effects (e.g., refresh, close modal)
- **No UI Coupling**: Hook has zero knowledge of presentation layer

---

### 2. `OtpInput.tsx` - Reusable Input Component

**Location:** `/Users/jules/Sites/directory/ui/verification/components/OtpInput.tsx`

**Purpose:** Standardized OTP input field with built-in validation, formatting, and accessibility.

**Interface Definition:**
```typescript
export interface OtpInputProps {
  // Controlled value
  value: string;

  // Change handler receives digit-only string
  onChange: (value: string) => void;

  // Optional custom placeholder
  placeholder?: string;

  // Optional custom ID for label association
  id?: string;

  // Optional label text (defaults to "One-time passcode (OTP)")
  label?: string;

  // Hide label visually but keep for accessibility
  hideLabel?: boolean;

  // Disabled state
  disabled?: boolean;

  // Error state for styling
  error?: boolean;

  // Auto-focus on mount
  autoFocus?: boolean;

  // Submit on Enter key
  onSubmit?: () => void;

  // Optional custom className
  className?: string;
}

export function OtpInput(props: OtpInputProps): JSX.Element;
```

**Implementation Strategy:**
```typescript
export function OtpInput({
  value,
  onChange,
  placeholder = "Paste your OTP",
  id = "otp-input",
  label = "One-time passcode (OTP)",
  hideLabel = false,
  disabled = false,
  error = false,
  autoFocus = false,
  onSubmit,
  className = "",
}: OtpInputProps) {
  // Digit-only input filtering
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyDigits = e.target.value.replace(/\D+/g, "");
    onChange(onlyDigits);
  };

  // Enter key handling
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onSubmit && value.trim()) {
      onSubmit();
    }
  };

  // Format for display (optional: XXX-XXX format)
  const formatOtp = (otp: string): string => {
    if (otp.length <= 3) return otp;
    return `${otp.slice(0, 3)}-${otp.slice(3, 6)}`;
  };

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={`block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1 ${
          hideLabel ? "sr-only" : ""
        }`}
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`w-full rounded-xl border px-3 py-2 text-sm outline-hidden
          ${error ? "border-red-500" : "border-black/30"}
          ${disabled ? "bg-gray-50 cursor-not-allowed" : "bg-white"}
          focus:border-blue-600`}
        maxLength={6}
        inputMode="numeric"
        autoComplete="one-time-code"
      />
    </div>
  );
}
```

**Key Design Decisions:**
- **Accessibility First**: Proper label association, `inputMode="numeric"`, `autoComplete="one-time-code"`
- **Format Flexibility**: Can display raw digits or formatted (XXX-XXX) based on variant needs
- **Error Styling**: Built-in error state for visual feedback
- **Keyboard Support**: Enter key triggers submission
- **Mobile Optimized**: `inputMode="numeric"` triggers number keyboard on mobile devices

---

### 3. `otpMessages.ts` - Centralized Status Messages

**Location:** `/Users/jules/Sites/directory/ui/verification/constants/otpMessages.ts`

**Purpose:** Single source of truth for all OTP status messages and result types.

**Interface Definition:**
```typescript
export type OtpStatus =
  | "verified"
  | "verified_and_no_pending_edits"
  | "invalid"
  | "locked"
  | "expired"
  | "otp_already_used"
  | "error"
  | "unknown";

export type OtpResultType = "ok" | "fail";

export interface OtpMessage {
  type: OtpResultType;
  text: string;
  // Optional variant for different contexts (modal vs inline)
  textInline?: string;
}

export const OTP_MESSAGES: Record<OtpStatus, OtpMessage> = {
  verified: {
    type: "ok",
    text: "Your profile has been updated. Close to refresh the page.",
    textInline: "OTP accepted. Page will refresh shortly.",
  },
  verified_and_no_pending_edits: {
    type: "ok",
    text: "Your address is verified, but there were no changes to apply.",
    textInline: "OTP accepted, but no changes were pending.",
  },
  invalid: {
    type: "fail",
    text: "Incorrect code. Please try again.",
  },
  locked: {
    type: "fail",
    text: "Too many failed attempts. This OTP is now locked.",
  },
  expired: {
    type: "fail",
    text: "This OTP has expired. Request a new one.",
  },
  otp_already_used: {
    type: "fail",
    text: "This OTP was already used. Generate a new one.",
  },
  error: {
    type: "fail",
    text: "An unexpected error occurred. Please try again.",
  },
  unknown: {
    type: "fail",
    text: "Unexpected response from server.",
  },
};

/**
 * Get message for OTP status
 * @param status - OTP status from server
 * @param variant - "default" or "inline" (affects which text is returned)
 * @returns OtpMessage object with type and text
 */
export function getOtpMessage(
  status: string | undefined,
  variant: "default" | "inline" = "default"
): OtpMessage {
  const message = OTP_MESSAGES[status as OtpStatus] || OTP_MESSAGES.unknown;

  // Return inline variant if requested and available
  if (variant === "inline" && message.textInline) {
    return { ...message, text: message.textInline };
  }

  return message;
}
```

**Key Design Decisions:**
- **Typed Status Values**: `OtpStatus` union type for compile-time safety
- **Variant Support**: Different messages for modal vs inline contexts
- **Helper Function**: `getOtpMessage()` with fallback to "unknown"
- **Extensibility**: Easy to add new statuses or message variants

---

## Migration Strategy

### Phase 1: Create Shared Modules (No Breaking Changes)

**Step 1.1: Create `otpMessages.ts`**
- Extract message constants from `SubmitOtp.tsx`
- Add `getOtpMessage()` helper function
- **Risk**: None (new file, no consumers yet)

**Step 1.2: Create `useOtpFlow.ts`**
- Implement state machine hook
- Add comprehensive JSDoc comments
- **Risk**: None (new hook, no consumers yet)

**Step 1.3: Create `OtpInput.tsx`**
- Extract input field markup and validation
- Add accessibility attributes
- **Risk**: None (new component, no consumers yet)

**Step 1.4: Write Unit Tests**
- `otpMessages.test.ts`: Test message retrieval and fallbacks
- `useOtpFlow.test.ts`: Test state machine transitions
- `OtpInput.test.tsx`: Test input validation and keyboard events
- **Risk**: Low (isolated test files)

**Deliverable:** Three new modules with 100% test coverage, zero impact on existing code.

---

### Phase 2: Migrate `InlineOtpForm.tsx` (Lower Risk)

**Why Start Here:**
- Simpler component (122 lines vs 309 lines)
- Fewer UI states (no help message, no modal backdrop)
- Fewer props and callbacks
- Easier to test in isolation

**Step 2.1: Update Imports**
```typescript
// BEFORE
import { useState } from "react";
import { confirmOtpAction } from "@/lib/verification/confirmOtpAction";

// AFTER
import { useOtpFlow } from "@/ui/verification/hooks/useOtpFlow";
import { OtpInput } from "@/ui/verification/components/OtpInput";
```

**Step 2.2: Replace State with Hook**
```typescript
// BEFORE (Lines 18-21)
const [step, setStep] = useState(0);
const [otp, setOtp] = useState("");
const [result, setResult] = useState<"ok" | "fail" | null>(null);
const [message, setMessage] = useState("");

// AFTER
const { state, actions } = useOtpFlow({
  profile,
  onSuccess: (data) => {
    if (onSuccess) onSuccess(data);
  },
});
```

**Step 2.3: Replace Input Field**
```typescript
// BEFORE (Lines 69-76)
<input
  id="inline-otp"
  type="text"
  value={otp}
  onChange={(e) => setOtp(e.target.value.replace(/\D+/g, ""))}
  placeholder="Paste your OTP"
  className="flex-1 rounded-xl border border-black/30 px-3 py-2 text-sm outline-hidden focus:border-blue-600 bg-white"
/>

// AFTER
<OtpInput
  id="inline-otp"
  value={state.otp}
  onChange={actions.setOtp}
  onSubmit={actions.submitOtp}
  className="flex-1"
/>
```

**Step 2.4: Update Step Rendering**
```typescript
// BEFORE: if (step === 0) ...
// AFTER: if (state.step === "ENTRY") ...

// BEFORE: if (step === 1) ...
// AFTER: if (state.step === "CHECKING") ...

// BEFORE: if (step === 2) ...
// AFTER: if (state.step === "RESULT") ...
```

**Step 2.5: Update Result Display**
```typescript
// BEFORE (Lines 94-101)
<div className={result === "ok" ? "text-green-700" : "text-red-600"}>
  {message}
</div>

// AFTER
<div className={state.result === "ok" ? "text-green-700" : "text-red-600"}>
  {state.message}
</div>
```

**Step 2.6: Replace Retry Logic**
```typescript
// BEFORE (Lines 106-111)
onClick={() => {
  setOtp("");
  setStep(0);
  setResult(null);
  setMessage("");
}}

// AFTER
onClick={actions.retry}
```

**Expected Outcome:**
- `InlineOtpForm.tsx` reduced from **122 lines → ~60 lines** (50% reduction)
- Zero functional changes
- All existing props and callbacks still work

**Testing Checklist:**
- [ ] Form renders with empty OTP input
- [ ] Non-digit characters are stripped on input
- [ ] Submit button calls hook's `submitOtp()`
- [ ] "Checking" state displays during submission
- [ ] Success message shows on `verified` status
- [ ] Error message shows on `invalid`, `locked`, `expired`, `otp_already_used`
- [ ] "Try again" button resets to entry state
- [ ] `onSuccess` callback fires on successful verification

---

### Phase 3: Migrate `SubmitOtp.tsx` (Higher Risk, Higher Reward)

**Why Second:**
- More complex component (309 lines)
- Modal with backdrop and portal rendering
- Additional features: help toggle, profile display, Enter key handling
- More edge cases to preserve

**Step 3.1: Update Imports**
```typescript
// AFTER
import { useOtpFlow } from "@/ui/verification/hooks/useOtpFlow";
import { OtpInput } from "@/ui/verification/components/OtpInput";
```

**Step 3.2: Replace State with Hook + Modal Reset**
```typescript
const { state, actions } = useOtpFlow({
  profile,
  onSuccess: () => {
    // Keep modal-specific reload behavior
  },
});

// Modal-specific: Reset on open
useEffect(() => {
  if (isOpen) {
    actions.reset();
    setShowHelp(false); // Keep help state in component (UI-only)
  }
}, [isOpen, actions]);
```

**Step 3.3: Replace Input Field**
```typescript
// BEFORE (Lines 188-200)
<input
  id="otp"
  type="text"
  value={otp}
  onChange={(e) => {
    const onlyDigits = e.target.value.replace(/\D+/g, "");
    setOtp(onlyDigits);
  }}
  placeholder="Paste your OTP"
  className="w-full rounded-xl border border-black/30 px-3 py-2 text-sm outline-hidden focus:border-blue-600 bg-white"
/>

// AFTER
<OtpInput
  id="otp"
  value={state.otp}
  onChange={actions.setOtp}
  onSubmit={actions.submitOtp}
  autoFocus
/>
```

**Step 3.4: Update Step Rendering**
```typescript
// BEFORE: {step === STEPS.ENTRY && ...}
// AFTER: {state.step === "ENTRY" && ...}

// BEFORE: {step === STEPS.CHECKING && ...}
// AFTER: {state.step === "CHECKING" && ...}

// BEFORE: {step === STEPS.RESULT && ...}
// AFTER: {state.step === "RESULT" && ...}
```

**Step 3.5: Update Button Handlers**
```typescript
// BEFORE (Lines 266-268)
onClick={() => {
  void handleSubmit();
}}

// AFTER
onClick={actions.submitOtp}

// BEFORE: disabled={!otp.trim()}
// AFTER: disabled={!state.otp.trim()}
```

**Step 3.6: Remove handleSubmit Function**
```typescript
// DELETE Lines 97-125 (entire handleSubmit function)
// Hook handles all submission logic now
```

**Step 3.7: Remove handleKeyPress (Handled by OtpInput)**
```typescript
// DELETE Lines 128-132
// OtpInput component handles Enter key internally
// REMOVE onKeyPress from modal wrapper
```

**Expected Outcome:**
- `SubmitOtp.tsx` reduced from **309 lines → ~180 lines** (42% reduction)
- Removed `handleSubmit` function (~28 lines)
- Removed `handleKeyPress` function (~5 lines)
- Removed `showResult` function (~5 lines)
- Removed `OTP_MESSAGES` constant (~25 lines)
- Removed state management boilerplate (~15 lines)
- Simplified input rendering (~12 lines)

**Testing Checklist:**
- [ ] Modal opens with empty OTP input
- [ ] Profile name and address display correctly
- [ ] OTP input strips non-digits
- [ ] Enter key submits OTP
- [ ] Submit button disabled when OTP empty
- [ ] "Checking" spinner displays during submission
- [ ] Success screen shows on `verified`
- [ ] Error screen shows on failures
- [ ] "Close" button refreshes page on success
- [ ] "Close" button just closes on failure
- [ ] Help toggle shows/hides help text
- [ ] Modal resets state when reopened
- [ ] Clicking backdrop closes modal

---

## Risk Mitigation Strategies

### Risk 1: State Machine Behavior Drift
**Impact:** High
**Probability:** Medium

**Mitigation:**
1. **Comprehensive Unit Tests**: Test all state transitions in `useOtpFlow.test.ts`
2. **Integration Tests**: Test both components with real server action mocks
3. **Visual Regression Tests**: Screenshot comparison before/after migration
4. **Manual QA Checklist**: Test all user flows in both components

### Risk 2: Callback Timing Issues
**Impact:** Medium
**Probability:** Low

**Current Behavior:**
- `InlineOtpForm` calls `onSuccess` synchronously after state update
- `SubmitOtp` refreshes page immediately after setting result

**Mitigation:**
1. Preserve exact callback timing in hook implementation
2. Document callback execution order in JSDoc
3. Test with mock callbacks to verify timing
4. Add console warnings if callbacks throw errors

### Risk 3: Input Validation Inconsistencies
**Impact:** Low
**Probability:** Low

**Mitigation:**
1. `OtpInput` component enforces digit-only at the component level
2. Hook's `setOtp` action also strips non-digits (defense in depth)
3. Add regex test in unit tests: `expect(state.otp).toMatch(/^\d*$/)`

### Risk 4: CSS/Styling Regressions
**Impact:** Low
**Probability:** Medium

**Mitigation:**
1. Keep existing className patterns in migrated components
2. Use Tailwind classes from original components
3. Visual diff screenshots before/after
4. Test on multiple screen sizes (mobile, tablet, desktop)

### Risk 5: Accessibility Regressions
**Impact:** Medium
**Probability:** Low

**Mitigation:**
1. `OtpInput` maintains all ARIA attributes and label associations
2. Add accessibility audit to testing checklist
3. Test with screen reader (VoiceOver or NVDA)
4. Verify keyboard navigation (Tab, Enter, Escape)

### Risk 6: Unknown Consumers of confirmOtpAction
**Impact:** High
**Probability:** Low

**Current Analysis:**
```bash
grep -r "confirmOtpAction" --include="*.tsx" --include="*.ts"
# Results: Only SubmitOtp.tsx and InlineOtpForm.tsx
```

**Mitigation:**
1. Search codebase for all `confirmOtpAction` usage before migration
2. Check for dynamic imports or lazy-loaded components
3. Grep for "otp" and "OTP" to find related code
4. Review git history for recently deleted OTP components

---

## Testing Strategy

### Unit Tests

**`otpMessages.test.ts`**
```typescript
describe("getOtpMessage", () => {
  it("returns verified message for 'verified' status", () => {
    const msg = getOtpMessage("verified");
    expect(msg.type).toBe("ok");
    expect(msg.text).toContain("updated");
  });

  it("returns inline variant when requested", () => {
    const msg = getOtpMessage("verified", "inline");
    expect(msg.text).toContain("refresh");
  });

  it("returns unknown message for unrecognized status", () => {
    const msg = getOtpMessage("invalid_status_xyz");
    expect(msg.type).toBe("fail");
    expect(msg.text).toContain("Unexpected");
  });

  it("handles undefined status gracefully", () => {
    const msg = getOtpMessage(undefined);
    expect(msg.type).toBe("fail");
  });
});
```

**`useOtpFlow.test.ts`**
```typescript
import { renderHook, act, waitFor } from "@testing-library/react";
import { useOtpFlow } from "./useOtpFlow";
import * as confirmOtpModule from "@/lib/verification/confirmOtpAction";

jest.mock("@/lib/verification/confirmOtpAction");

describe("useOtpFlow", () => {
  const mockProfile = { id: 123, name: "Test User" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes with ENTRY step and empty OTP", () => {
    const { result } = renderHook(() => useOtpFlow({ profile: mockProfile }));
    expect(result.current.state.step).toBe("ENTRY");
    expect(result.current.state.otp).toBe("");
    expect(result.current.state.result).toBeNull();
  });

  it("strips non-digits from OTP input", () => {
    const { result } = renderHook(() => useOtpFlow({ profile: mockProfile }));
    act(() => {
      result.current.actions.setOtp("123abc456");
    });
    expect(result.current.state.otp).toBe("123456");
  });

  it("transitions ENTRY → CHECKING → RESULT on successful verification", async () => {
    jest.spyOn(confirmOtpModule, "confirmOtpAction").mockResolvedValue({
      ok: true,
      data: { status: "verified" },
    });

    const { result } = renderHook(() => useOtpFlow({ profile: mockProfile }));

    act(() => {
      result.current.actions.setOtp("123456");
    });

    expect(result.current.state.step).toBe("ENTRY");

    act(() => {
      result.current.actions.submitOtp();
    });

    // Should transition to CHECKING immediately
    await waitFor(() => {
      expect(result.current.state.step).toBe("CHECKING");
    });

    // Should transition to RESULT after API call
    await waitFor(() => {
      expect(result.current.state.step).toBe("RESULT");
      expect(result.current.state.result).toBe("ok");
      expect(result.current.state.message).toContain("updated");
    });
  });

  it("handles invalid OTP status", async () => {
    jest.spyOn(confirmOtpModule, "confirmOtpAction").mockResolvedValue({
      ok: true,
      data: { status: "invalid" },
    });

    const { result } = renderHook(() => useOtpFlow({ profile: mockProfile }));

    act(() => {
      result.current.actions.setOtp("999999");
      result.current.actions.submitOtp();
    });

    await waitFor(() => {
      expect(result.current.state.step).toBe("RESULT");
      expect(result.current.state.result).toBe("fail");
      expect(result.current.state.message).toContain("Incorrect code");
    });
  });

  it("calls onSuccess callback on verified status", async () => {
    const onSuccess = jest.fn();
    jest.spyOn(confirmOtpModule, "confirmOtpAction").mockResolvedValue({
      ok: true,
      data: { status: "verified" },
    });

    const { result } = renderHook(() => useOtpFlow({
      profile: mockProfile,
      onSuccess,
    }));

    act(() => {
      result.current.actions.setOtp("123456");
      result.current.actions.submitOtp();
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({
        status: "verified",
        message: expect.any(String),
      });
    });
  });

  it("resets all state on reset action", () => {
    const { result } = renderHook(() => useOtpFlow({ profile: mockProfile }));

    act(() => {
      result.current.actions.setOtp("123456");
      // Manually set state for testing
      result.current.state.step = "RESULT";
      result.current.state.result = "fail";
      result.current.state.message = "Error";
    });

    act(() => {
      result.current.actions.reset();
    });

    expect(result.current.state.step).toBe("ENTRY");
    expect(result.current.state.otp).toBe("");
    expect(result.current.state.result).toBeNull();
    expect(result.current.state.message).toBe("");
  });

  it("returns to ENTRY on retry action", () => {
    const { result } = renderHook(() => useOtpFlow({ profile: mockProfile }));

    // Simulate reaching RESULT state
    act(() => {
      result.current.state.step = "RESULT";
      result.current.state.result = "fail";
      result.current.state.message = "Error";
    });

    act(() => {
      result.current.actions.retry();
    });

    expect(result.current.state.step).toBe("ENTRY");
    expect(result.current.state.otp).toBe("");
    expect(result.current.state.result).toBeNull();
  });
});
```

**`OtpInput.test.tsx`**
```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { OtpInput } from "./OtpInput";

describe("OtpInput", () => {
  it("renders with default label", () => {
    render(<OtpInput value="" onChange={() => {}} />);
    expect(screen.getByLabelText(/one-time passcode/i)).toBeInTheDocument();
  });

  it("renders with custom label", () => {
    render(<OtpInput value="" onChange={() => {}} label="Enter Code" />);
    expect(screen.getByLabelText("Enter Code")).toBeInTheDocument();
  });

  it("hides label when hideLabel is true", () => {
    render(<OtpInput value="" onChange={() => {}} hideLabel />);
    const label = screen.getByText(/one-time passcode/i);
    expect(label).toHaveClass("sr-only");
  });

  it("strips non-digit characters on input", () => {
    const onChange = jest.fn();
    render(<OtpInput value="" onChange={onChange} />);
    const input = screen.getByRole("textbox");

    fireEvent.change(input, { target: { value: "12abc34" } });

    expect(onChange).toHaveBeenCalledWith("1234");
  });

  it("calls onSubmit when Enter key is pressed", () => {
    const onSubmit = jest.fn();
    render(<OtpInput value="123456" onChange={() => {}} onSubmit={onSubmit} />);
    const input = screen.getByRole("textbox");

    fireEvent.keyPress(input, { key: "Enter", code: "Enter" });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not call onSubmit when value is empty", () => {
    const onSubmit = jest.fn();
    render(<OtpInput value="" onChange={() => {}} onSubmit={onSubmit} />);
    const input = screen.getByRole("textbox");

    fireEvent.keyPress(input, { key: "Enter", code: "Enter" });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("applies error styling when error prop is true", () => {
    render(<OtpInput value="" onChange={() => {}} error />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveClass("border-red-500");
  });

  it("applies disabled state", () => {
    render(<OtpInput value="" onChange={() => {}} disabled />);
    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();
    expect(input).toHaveClass("bg-gray-50", "cursor-not-allowed");
  });

  it("has correct accessibility attributes", () => {
    render(<OtpInput value="" onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("inputMode", "numeric");
    expect(input).toHaveAttribute("autoComplete", "one-time-code");
    expect(input).toHaveAttribute("maxLength", "6");
  });
});
```

### Integration Tests

**`InlineOtpForm.integration.test.tsx`**
```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InlineOtpForm from "./InlineOtpForm";
import * as confirmOtpModule from "@/lib/verification/confirmOtpAction";

jest.mock("@/lib/verification/confirmOtpAction");

describe("InlineOtpForm Integration", () => {
  const mockProfile = { id: 123, name: "Test", address: "z1abc..." };

  it("completes full successful verification flow", async () => {
    const onSuccess = jest.fn();
    jest.spyOn(confirmOtpModule, "confirmOtpAction").mockResolvedValue({
      ok: true,
      data: { status: "verified" },
    });

    render(<InlineOtpForm profile={mockProfile} onSuccess={onSuccess} />);

    // Enter OTP
    const input = screen.getByPlaceholderText(/paste your otp/i);
    fireEvent.change(input, { target: { value: "123456" } });

    // Submit
    const submitButton = screen.getByText(/submit otp/i);
    fireEvent.click(submitButton);

    // Should show checking state
    await waitFor(() => {
      expect(screen.getByText(/checking your code/i)).toBeInTheDocument();
    });

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/otp accepted/i)).toBeInTheDocument();
      expect(onSuccess).toHaveBeenCalledWith({
        status: "verified",
        message: expect.any(String),
      });
    });
  });

  it("handles invalid OTP with retry", async () => {
    jest.spyOn(confirmOtpModule, "confirmOtpAction").mockResolvedValue({
      ok: true,
      data: { status: "invalid" },
    });

    render(<InlineOtpForm profile={mockProfile} />);

    // Enter and submit invalid OTP
    const input = screen.getByPlaceholderText(/paste your otp/i);
    fireEvent.change(input, { target: { value: "999999" } });
    fireEvent.click(screen.getByText(/submit otp/i));

    // Should show error
    await waitFor(() => {
      expect(screen.getByText(/incorrect code/i)).toBeInTheDocument();
    });

    // Click "Try again"
    const retryButton = screen.getByText(/try again/i);
    fireEvent.click(retryButton);

    // Should return to entry state
    expect(screen.getByPlaceholderText(/paste your otp/i)).toBeInTheDocument();
    expect(input).toHaveValue("");
  });
});
```

### Manual QA Checklist

**Pre-Migration (Baseline Behavior):**
- [ ] Test `SubmitOtp` modal: open, enter OTP, submit, close
- [ ] Test `InlineOtpForm`: enter OTP, submit, see result
- [ ] Screenshot all states (entry, checking, success, error)
- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on mobile viewport (iOS, Android)
- [ ] Test keyboard navigation (Tab, Enter, Escape)
- [ ] Test screen reader announcements

**Post-Migration (Verify No Regressions):**
- [ ] Repeat all pre-migration tests
- [ ] Compare screenshots (should be pixel-perfect)
- [ ] Verify no console errors or warnings
- [ ] Check network tab for duplicate API calls
- [ ] Test error scenarios: invalid, locked, expired, otp_already_used
- [ ] Verify page refresh behavior on success
- [ ] Test modal backdrop click to close
- [ ] Test help toggle in modal

---

## Rollback Plan

### Emergency Rollback (If Critical Bug Found)

**Scenario:** Migration causes a blocking bug in production (e.g., OTP submission fails completely)

**Action:**
```bash
# Revert the specific commit(s)
git revert <migration-commit-hash>

# Or restore specific files from previous commit
git checkout HEAD~1 ui/verification/SubmitOtp.tsx
git checkout HEAD~1 ui/verification/InlineOtpForm.tsx

# Commit rollback
git commit -m "Rollback: Revert OTP consolidation due to [bug description]"

# Deploy immediately
npm run build && npm run deploy
```

**Time to Rollback:** < 5 minutes
**Risk:** None (restores exact previous working code)

### Partial Rollback (If One Component Has Issues)

**Scenario:** `SubmitOtp` migration works, but `InlineOtpForm` has issues

**Action:**
```bash
# Revert only InlineOtpForm.tsx
git checkout HEAD~1 ui/verification/InlineOtpForm.tsx
git commit -m "Rollback: Revert InlineOtpForm migration, keep SubmitOtp"
```

**Benefit:** Keep 50% of consolidation benefits while fixing issues

### Gradual Rollout (Feature Flag)

**Advanced Strategy:** Use feature flag to control which component uses new hooks

```typescript
// In feature-flags.ts
export const USE_OTP_FLOW_HOOK = process.env.NEXT_PUBLIC_USE_OTP_FLOW_HOOK === "true";

// In SubmitOtp.tsx
import { USE_OTP_FLOW_HOOK } from "@/lib/feature-flags";

export default function SubmitOtp(props: SubmitOtpProps) {
  if (USE_OTP_FLOW_HOOK) {
    return <SubmitOtpWithHook {...props} />;
  }
  return <SubmitOtpLegacy {...props} />;
}
```

**Benefit:**
- Test in production with small percentage of users
- Instant rollback via environment variable
- A/B test to verify no behavior changes

---

## Success Metrics

### Code Quality Metrics
- [ ] **Lines of Code Reduced**: Target 35-40% reduction
  - Before: 309 (SubmitOtp) + 122 (InlineOtpForm) = **431 lines**
  - After: ~180 (SubmitOtp) + ~60 (InlineOtpForm) + 80 (hook) + 50 (input) + 40 (messages) = **410 lines**
  - **Net Savings**: ~21 lines + reusability for future components
- [ ] **Cyclomatic Complexity**: Reduce by 30% (eliminate duplicate conditionals)
- [ ] **Test Coverage**: Achieve 95%+ on all new modules

### Maintainability Metrics
- [ ] **Single Source of Truth**: All OTP logic in one place (useOtpFlow)
- [ ] **DRY Compliance**: Zero duplication of state machine logic
- [ ] **Future-Proofing**: New OTP components can reuse hook (5-minute integration)

### Performance Metrics
- [ ] **No Performance Regression**: Verify no increase in render count
- [ ] **Bundle Size**: No significant increase (shared code = smaller bundle)

### Developer Experience Metrics
- [ ] **Documentation**: All exports have JSDoc with examples
- [ ] **Type Safety**: 100% TypeScript, no `any` types
- [ ] **Discoverability**: Clear folder structure (`hooks/`, `components/`, `constants/`)

---

## Timeline Estimate

| Phase | Task | Estimated Time | Risk Level |
|-------|------|----------------|------------|
| **Phase 1** | Create `otpMessages.ts` | 30 minutes | Low |
| | Create `useOtpFlow.ts` | 2 hours | Medium |
| | Create `OtpInput.tsx` | 1 hour | Low |
| | Write unit tests | 3 hours | Low |
| | **Phase 1 Total** | **6.5 hours** | **Low** |
| **Phase 2** | Migrate `InlineOtpForm.tsx` | 1 hour | Low |
| | Integration testing | 1 hour | Low |
| | Manual QA | 30 minutes | Low |
| | **Phase 2 Total** | **2.5 hours** | **Low** |
| **Phase 3** | Migrate `SubmitOtp.tsx` | 2 hours | Medium |
| | Integration testing | 1.5 hours | Medium |
| | Manual QA | 1 hour | Low |
| | **Phase 3 Total** | **4.5 hours** | **Medium** |
| **Deployment** | Code review | 1 hour | Low |
| | Staging deployment | 30 minutes | Low |
| | Production deployment | 30 minutes | Medium |
| | Monitoring | 1 hour | Low |
| | **Deployment Total** | **3 hours** | **Low-Medium** |
| **TOTAL** | | **16.5 hours** (~2 days) | |

---

## Dependencies and Blockers

### External Dependencies
- **None** - All work is internal refactoring

### Internal Dependencies
- Requires existing `confirmOtpAction` to remain stable
- Assumes no concurrent work on OTP components during migration

### Potential Blockers
1. **Feature Freeze**: If OTP components are under active feature development
   - **Mitigation**: Coordinate with team to pause feature work during migration
2. **Production Incidents**: Urgent bugs requiring immediate OTP fixes
   - **Mitigation**: Can pause migration and resume after incident resolution
3. **Test Infrastructure**: If testing utilities are incomplete
   - **Mitigation**: Set up testing infrastructure in Phase 1

---

## Post-Migration Enhancements (Future Work)

### Not in Scope for Phase 4.1, but Enabled by This Work:

1. **OTP Format Validation**
   - Add visual feedback for 6-digit requirement
   - Show formatted display (XXX-XXX) while typing
   - **Effort:** 2 hours (contained in `OtpInput.tsx`)

2. **Enhanced Error Recovery**
   - "Request new OTP" button on expired/locked states
   - Auto-retry logic for network errors
   - **Effort:** 4 hours (extend `useOtpFlow.ts`)

3. **Analytics Integration**
   - Track OTP submission success rates
   - Monitor common failure reasons
   - **Effort:** 2 hours (add callbacks to hook)

4. **Accessibility Enhancements**
   - ARIA live regions for status updates
   - Improved screen reader announcements
   - **Effort:** 3 hours (enhance `OtpInput.tsx`)

5. **Additional UI Variants**
   - Popover OTP form (lightweight alternative to modal)
   - Toast-based OTP submission
   - **Effort:** 2 hours per variant (reuse `useOtpFlow` + `OtpInput`)

---

## Conclusion

This consolidation plan provides a systematic, low-risk approach to eliminating duplicate OTP verification logic while improving code quality, maintainability, and developer experience. By following a three-phase migration strategy—starting with new shared modules, then migrating the simpler component first—we minimize risk and ensure a smooth transition.

**Key Takeaways:**
- **Clear Interfaces**: Well-defined hooks and components with TypeScript types
- **Incremental Migration**: Low-risk, phase-by-phase approach
- **Comprehensive Testing**: Unit, integration, and manual QA checklists
- **Emergency Rollback**: < 5-minute rollback plan if issues arise
- **Future-Proofing**: New OTP variants can reuse shared logic in minutes

**Next Steps:**
1. Review this plan with team
2. Get approval for Phase 1 (create shared modules)
3. Begin implementation with `otpMessages.ts`
4. Follow testing strategy rigorously
5. Monitor production metrics post-deployment

---

**Document Version:** 1.0
**Last Updated:** 2026-02-10
**Author:** OTP Consolidation Analysis
**Status:** Ready for Implementation
