"use client";

import { useState } from "react";
import { supabase } from "../supabase";

export default function InlineOtpForm({ profile, onSuccess }) {
  const [step, setStep] = useState(0); // 0=enter, 1=checking, 2=result
  const [otp, setOtp] = useState("");
  const [result, setResult] = useState(null); // "ok" | "fail"
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    const zid = profile?.id;
    if (!zid || !otp) return;
    setStep(1);
    try {
      const { data, error } = await supabase.rpc("confirm_otp_sql", {
        in_zcasher_id: zid,
        in_otp: otp,
      });
      if (error) {
        setResult("fail");
        setMessage("Unexpected server error.");
        setStep(2);
        return;
      }
      const status = data?.status;
      if (status === "verified" || status === "verified_and_no_pending_edits") {
        setResult("ok");
        setMessage("OTP accepted. Page will refresh shortly.");
        setStep(2);
        if (onSuccess) onSuccess({ status, message: "OTP accepted. Page will refresh shortly." });
        return;
      }
      let failMsg = "Unexpected response from server.";
      if (status === "invalid") failMsg = "Incorrect code. Please try again.";
      else if (status === "locked") failMsg = "Too many failed attempts. This OTP is now locked.";
      else if (status === "expired") failMsg = "This OTP has expired. Request a new one.";
      else if (status === "otp_already_used") failMsg = "This OTP was already used. Generate a new one.";
      setResult("fail");
      setMessage(failMsg);
      setStep(2);
    } catch (err) {
      console.error("Inline OTP request failed:", err);
      setResult("fail");
      setMessage("Unexpected error.");
      setStep(2);
    }
  }

  return (
    <div className="mt-3 border border-black/10 rounded-xl p-3 bg-white/80">
      {step === 0 && (
        <>
          <label
            htmlFor="inline-otp"
            className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1"
          >
            Enter Passcode
          </label>
          <div className="flex gap-2">
            <input
              id="inline-otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D+/g, ""))}
              placeholder="Paste your OTP"
              className="flex-1 rounded-xl border border-black/30 px-3 py-2 text-sm outline-none focus:border-blue-600 bg-white"
            />
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-xl border border-black/30 px-4 py-2 text-sm font-semibold text-blue-700 hover:border-blue-600 hover:bg-blue-50"
            >
              Submit OTP
            </button>
          </div>
        </>
      )}
      {step === 1 && (
        <div className="text-sm text-gray-700 italic">Checking your code...</div>
      )}
      {step === 2 && (
        <div className="flex items-center justify-between gap-2">
          <div
            className={
              result === "ok"
                ? "text-sm text-green-700 font-semibold"
                : "text-sm text-red-600 font-semibold"
            }
          >
            {message}
          </div>
          {result !== "ok" && (
            <button
              type="button"
              onClick={() => {
                setOtp("");
                setStep(0);
                setResult(null);
                setMessage("");
              }}
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
