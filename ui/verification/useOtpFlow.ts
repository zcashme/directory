"use client";

import { useState, useCallback } from "react";
import { getOtpMessage, type OtpStatus } from "./otpMessages";

/**
 * OTP Flow Steps
 * Represents the three-step verification flow state machine
 */
export enum OtpStep {
  /** Initial state: User enters OTP */
  ENTRY = 0,
  /** Processing state: Verifying OTP with server */
  CHECKING = 1,
  /** Final state: Display result (success or error) */
  RESULT = 2,
}

/**
 * OTP Flow State
 * Current state of the OTP verification flow
 */
export interface OtpFlowState {
  /** Current step in the flow */
  step: OtpStep;

  /** OTP value (digits only) */
  otp: string;

  /** Verification status (null until result received) */
  status: OtpStatus | null;

  /** Status message to display */
  message: string;

  /** True while verification request is in flight */
  isChecking: boolean;
}

/**
 * OTP Flow Actions
 * Actions that can be performed on the OTP flow
 */
export interface OtpFlowActions {
  /**
   * Update OTP value
   * Automatically strips non-digit characters
   *
   * @param otp - OTP string (will be filtered to digits only)
   */
  setOtp: (otp: string) => void;

  /**
   * Submit OTP for verification
   * Transitions through CHECKING → RESULT states
   *
   * @param profileId - Profile ID to verify OTP against
   * @returns Promise that resolves when verification completes
   */
  submit: (profileId: string | number) => Promise<void>;

  /**
   * Reset flow to initial state
   * Clears all state and returns to ENTRY step
   */
  reset: () => void;
}

/**
 * Complete OTP Flow Hook Result
 * Combines state and actions for consuming components
 */
export type UseOtpFlowResult = OtpFlowState & OtpFlowActions;

/**
 * OTP Flow Hook Options
 */
export interface UseOtpFlowOptions {
  /**
   * Optional callback fired on successful verification
   * @param data - Success data with status and message
   */
  onSuccess?: (data: { status: string; message: string }) => void;

  /**
   * Optional callback fired on verification error
   * @param message - Error message
   */
  onError?: (message: string) => void;
}

/**
 * OTP Verification Flow State Machine Hook
 *
 * Manages the complete OTP verification lifecycle:
 * 1. ENTRY: User enters OTP
 * 2. CHECKING: Server validates OTP
 * 3. RESULT: Display success or error message
 *
 * Features:
 * - Automatic digit-only filtering
 * - Server action integration
 * - Standardized error handling
 * - Success/error callbacks
 * - Reset capability
 *
 * @param confirmAction - Server action to verify OTP
 * @param options - Optional callbacks for success/error
 * @returns OTP flow state and actions
 *
 * @example
 * ```tsx
 * const otpFlow = useOtpFlow(confirmOtpAction, {
 *   onSuccess: (data) => {
 *     console.log("Verified!", data);
 *     router.refresh();
 *   },
 *   onError: (message) => {
 *     console.error("Failed:", message);
 *   }
 * });
 *
 * // In component:
 * <input value={otpFlow.otp} onChange={(e) => otpFlow.setOtp(e.target.value)} />
 * <button onClick={() => otpFlow.submit(profileId)}>Submit</button>
 *
 * {otpFlow.step === OtpStep.CHECKING && <Spinner />}
 * {otpFlow.step === OtpStep.RESULT && <Message>{otpFlow.message}</Message>}
 * ```
 */
export function useOtpFlow(
  confirmAction: (profileId: string | number, otp: string) => Promise<any>,
  options?: UseOtpFlowOptions
): UseOtpFlowResult {
  // State machine
  const [step, setStep] = useState<OtpStep>(OtpStep.ENTRY);
  const [otp, setOtpValue] = useState("");
  const [status, setStatus] = useState<OtpStatus | null>(null);
  const [message, setMessage] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  /**
   * Set OTP with automatic digit stripping
   */
  const setOtp = useCallback((value: string) => {
    const onlyDigits = value.replace(/\D+/g, "");
    setOtpValue(onlyDigits);
  }, []);

  /**
   * Submit OTP for verification
   * State transitions: ENTRY → CHECKING → RESULT
   */
  const submit = useCallback(
    async (profileId: string | number) => {
      if (!profileId || !otp.trim()) {
        return;
      }

      // Transition to checking state
      setIsChecking(true);
      setStep(OtpStep.CHECKING);

      try {
        // Call server action
        const response = await confirmAction(profileId, otp.trim());

        // Handle server error response
        if (!response.ok) {
          const errorMsg = response.error || "Unexpected server error.";
          setStatus("fail");
          setMessage(errorMsg);
          setStep(OtpStep.RESULT);
          options?.onError?.(errorMsg);
          return;
        }

        // Get standardized message for status
        const serverStatus = response.data?.status;
        const otpMessage = getOtpMessage(serverStatus);

        // Update state with result
        setStatus(otpMessage.variant);
        setMessage(otpMessage.text);
        setStep(OtpStep.RESULT);

        // Fire callbacks
        if (otpMessage.variant === "ok") {
          options?.onSuccess?.({
            status: serverStatus || "verified",
            message: otpMessage.text,
          });
        } else {
          options?.onError?.(otpMessage.text);
        }
      } catch (error) {
        // Handle unexpected errors
        const errorMsg = "Unexpected error.";
        setStatus("fail");
        setMessage(errorMsg);
        setStep(OtpStep.RESULT);
        options?.onError?.(errorMsg);
      } finally {
        setIsChecking(false);
      }
    },
    [otp, confirmAction, options]
  );

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setStep(OtpStep.ENTRY);
    setOtpValue("");
    setStatus(null);
    setMessage("");
    setIsChecking(false);
  }, []);

  return {
    // State
    step,
    otp,
    status,
    message,
    isChecking,

    // Actions
    setOtp,
    submit,
    reset,
  };
}
