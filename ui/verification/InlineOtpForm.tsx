"use client";

import { useOtpFlow, OtpStep } from "./useOtpFlow";
import { OtpInput } from "./OtpInput";
import { confirmOtpAction } from "@/lib/verification/confirmOtpAction";
import type { Profile } from "@/lib/profile/types";
import Button from "@/ui/common/buttons/Button";
import FormField from "@/ui/common/forms/FormField";

interface SuccessData {
  status: string;
  message: string;
}

interface InlineOtpFormProps {
  profile: Partial<Profile>;
  onSuccess?: (data: SuccessData) => void;
}

export default function InlineOtpForm({ profile, onSuccess }: InlineOtpFormProps) {
  const otpFlow = useOtpFlow(confirmOtpAction, {
    onSuccess: (data) => {
      if (onSuccess && data?.status) {
        onSuccess({ status: data.status, message: "OTP accepted. Page will refresh shortly." });
      }
    },
  });

  const zid = profile?.id;

  return (
    <div className="mt-3 border border-black/10 rounded-xl p-3 bg-white/80">
      {otpFlow.step === OtpStep.ENTRY && (
        <FormField
          label="Verification Code"
          htmlFor="inline-otp"
          helpText="Enter the 6-digit code sent to your email"
          labelClassName="text-xs uppercase tracking-wide"
        >
          <div className="flex gap-2">
            <OtpInput
              id="inline-otp"
              value={otpFlow.otp}
              onChange={otpFlow.setOtp}
              onSubmit={() => {
                if (zid) otpFlow.submit(zid);
              }}
              placeholder="Paste your OTP"
              hideLabel={true}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={() => {
                if (zid) void otpFlow.submit(zid);
              }}
              variant="primary"
              size="md"
            >
              Submit OTP
            </Button>
          </div>
        </FormField>
      )}
      {otpFlow.step === OtpStep.CHECKING && (
        <div className="text-sm text-gray-700 italic">Checking your code...</div>
      )}
      {otpFlow.step === OtpStep.RESULT && (
        <div className="flex items-center justify-between gap-2">
          <div
            className={
              otpFlow.status === "ok"
                ? "text-sm text-green-700 font-semibold"
                : "text-sm text-red-600 font-semibold"
            }
          >
            {otpFlow.message}
          </div>
          {otpFlow.status !== "ok" && (
            <button
              type="button"
              onClick={() => otpFlow.reset()}
              className="text-xs font-semibold text-blue-600 underline"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
