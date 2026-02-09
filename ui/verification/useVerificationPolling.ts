import { useEffect, useMemo, useRef } from "react";
import { useMessagingStore } from "@/lib/stores/messaging";

const VERIFY_API_BASE =
  process.env.NEXT_PUBLIC_VERIFY_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

type OtpPhaseHistoryItem = {
  phase?: string | null;
};

type VerifyPollResponse = {
  status?: string;
  otp_status?: string | null;
  otp_phase?: string | null;
  otp_phase_history?: OtpPhaseHistoryItem[];
  request_id?: string | null;
  started_at?: string | null;
  [key: string]: unknown;
};

interface ProgressStep {
  key: string;
  label: string;
  done: boolean;
}

interface ProgressState {
  doneCount: number;
  currentIndex: number | null;
}

interface OtpPhaseStep {
  phase: string;
  isCurrent: boolean;
  failed: boolean;
  showGreenCheck: boolean;
}

export interface UseVerificationPollingResult {
  startPolling: (zid: string) => Promise<void>;
  progressSteps: ProgressStep[];
  progressState: ProgressState;
  progressPercent: number;
  progressBarClass: string;
  statusSeconds: number;
  statusLine: string;
  otpPhaseSteps: OtpPhaseStep[];
  showOtpPhaseLine: boolean;
  progressExplainer: string;
  handleInlineOtpSuccess: () => void;
}

export default function useVerificationPolling(): UseVerificationPollingResult {
  const {
    verifyQrEnabled,
    verify,
    pollStatus,
    pollOtpPhase,
    pollOtpPhaseHistory,
    otpInlineSuccess,
    pollError,
    pollElapsedMs,
    setVerify,
    setPollStatus,
    setPollOtpStatus,
    setPollOtpPhase,
    setPollOtpPhaseHistory,
    setOtpInlineSuccess,
    setPollError,
    setPollDebug,
    setPollStartedAt,
    setPollElapsedMs,
  } = useMessagingStore();

  const pollRequestId = verify.requestId;
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollElapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup function to stop polling
  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (pollElapsedRef.current) {
      clearInterval(pollElapsedRef.current);
      pollElapsedRef.current = null;
    }
  };

  useEffect(() => {
    if (!verifyQrEnabled || !pollRequestId) {
      stopPolling();
      return;
    }

    let cancelled = false;
    const intervalMs = 1500;

    const checkOnce = async () => {
      if (cancelled) return;
      try {
        const res = await fetch(
          `${VERIFY_API_BASE}/verify/poll/${encodeURIComponent(
            pollRequestId
          )}/status`
        );
        const data = (await res.json()) as VerifyPollResponse;

        if (cancelled) return;

        if (data?.status === "matched") {
          setPollStatus("matched");
          setPollOtpStatus(data?.otp_status || null);
          setPollOtpPhase(data?.otp_phase || null);
          setPollOtpPhaseHistory(
            Array.isArray(data?.otp_phase_history)
              ? data!.otp_phase_history
              : []
          );
          const otpPhaseNow = (data?.otp_phase || "").toLowerCase();
          if (
            otpPhaseNow === "sent" ||
            otpPhaseNow === "failed"
          ) {
            if (pollElapsedRef.current) {
              clearInterval(pollElapsedRef.current);
              pollElapsedRef.current = null;
            }
            return;
          }
        }

        if (data?.status) {
          setPollStatus(data.status);
        }
        if (data?.otp_status) {
          setPollOtpStatus(data.otp_status);
        }
        if (data?.otp_phase || data?.otp_phase_history) {
          setPollOtpPhase(data?.otp_phase || null);
          setPollOtpPhaseHistory(
            Array.isArray(data?.otp_phase_history)
              ? data.otp_phase_history
              : []
          );
        }
      } catch (err) {
        const msg = `verify poll status failed: ${
          (err as Error)?.message || err
        }`;
        setPollError("Unable to check verification status yet.");
        setPollDebug((prev) => (prev ? `${prev}\n${msg}` : msg));
      }
      pollTimerRef.current = setTimeout(checkOnce, intervalMs);
    };

    checkOnce();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [pollRequestId, verifyQrEnabled, setPollStatus, setPollOtpStatus, setPollOtpPhase, setPollOtpPhaseHistory, setPollError, setPollDebug]);

  const startPolling = async (zid: string) => {
    setPollStatus("starting");
    setPollError("");
    try {
      const res = await fetch(
        `${VERIFY_API_BASE}/verify/poll/start?zid=${encodeURIComponent(zid)}`,
        { method: "POST" }
      );
      const data = (await res.json()) as VerifyPollResponse;

      if (!res.ok || !data?.request_id) {
        const msg = `verify poll start failed: ${res.status} ${res.statusText} ${JSON.stringify(
          data
        )}`;
        setPollError(String(data?.error || "Failed to start verification polling."));
        setPollDebug((prev) => (prev ? `${prev}\n${msg}` : msg));
        return;
      }

      setVerify((prev) => ({ ...prev, requestId: data.request_id! }));
      setPollStatus(data.status || "pending");
      setPollOtpStatus(null);
      setPollOtpPhase(null);
      setPollOtpPhaseHistory([]);
      setOtpInlineSuccess(false);
      setPollStartedAt(data.started_at || null);

      if (data.started_at && !pollElapsedRef.current) {
        const startedAtMs = Date.parse(data.started_at);
        if (!Number.isNaN(startedAtMs)) {
          setPollElapsedMs(Date.now() - startedAtMs);
          pollElapsedRef.current = setInterval(() => {
            setPollElapsedMs(Date.now() - startedAtMs);
          }, 1000);
        }
      }
    } catch (err) {
      const msg = `verify poll start failed: ${(err as Error)?.message || err}`;
      setPollError("Failed to start verification polling.");
      setPollDebug((prev) => (prev ? `${prev}\n${msg}` : msg));
    }
  };

  const progressSteps = useMemo<ProgressStep[]>(() => {
    const otpPhase = (pollOtpPhase || "").toLowerCase();
    return [
      { key: "polling", label: "Starting up", done: !!pollRequestId },
      { key: "listening", label: "Listening for memo", done: pollStatus === "matched" },
      { key: "otp", label: "Sending OTP", done: otpPhase === "sent" || otpPhase === "failed" },
      { key: "passcode", label: "Enter Passcode", done: false },
    ];
  }, [pollOtpPhase, pollRequestId, pollStatus]);

  const progressState = useMemo<ProgressState>(() => {
    if (otpInlineSuccess) {
      return { doneCount: progressSteps.length, currentIndex: null };
    }
    const otpPhase = (pollOtpPhase || "").toLowerCase();
    if (otpPhase === "sent") {
      return { doneCount: 3, currentIndex: 3 };
    }
    if (otpPhase === "creating" || otpPhase === "stored" || otpPhase === "sending") {
      return { doneCount: 2, currentIndex: 2 };
    }
    if (otpPhase === "failed") {
      return { doneCount: 3, currentIndex: 3 };
    }
    if (pollStatus === "matched") {
      return { doneCount: 2, currentIndex: 2 };
    }
    if (pollRequestId) {
      return { doneCount: 1, currentIndex: 1 };
    }
    return { doneCount: 0, currentIndex: 0 };
  }, [otpInlineSuccess, pollOtpPhase, pollRequestId, pollStatus, progressSteps.length]);

  const progressPercent = useMemo(() => {
    if (!progressSteps.length) return 0;
    return Math.round((progressState.doneCount / progressSteps.length) * 100);
  }, [progressState.doneCount, progressSteps.length]);

  const otpPhaseSteps = useMemo<OtpPhaseStep[]>(() => {
    const phases = ["creating", "stored", "sending", "sent"];
    const current = (pollOtpPhase || "").toLowerCase();
    const failed = current === "failed";
    const history = pollOtpPhaseHistory;
    const seen = history
      .map((h) => (h?.phase || "").toLowerCase())
      .filter(Boolean);
    const currentIdx = phases.indexOf(current);
    const seenIdxs = phases
      .map((p, idx) => (seen.includes(p) ? idx : -1))
      .filter((idx) => idx >= 0);
    const lastSeenIdx = seenIdxs.length ? Math.max(...seenIdxs) : -1;
    let activeIdx = currentIdx >= 0 ? currentIdx : lastSeenIdx;
    if (progressState.currentIndex === 3 && current === "sent") {
      activeIdx = -1;
    }
    return phases.map((phase, idx) => {
      const isCurrent = idx === activeIdx && activeIdx !== -1;
      const seenPhase = seen.includes(phase);
      const showGreenCheck =
        seenPhase && (!isCurrent || current === "sent");
      return { phase, isCurrent, failed, showGreenCheck };
    });
  }, [pollOtpPhase, pollOtpPhaseHistory, progressState.currentIndex]);

  const showOtpPhaseLine = (progressState.currentIndex ?? 0) >= 2;

  const progressExplainer = useMemo(() => {
    if (pollError) return "There was a problem starting verification. Please try again.";
    if (otpInlineSuccess) return "OTP accepted. Page will refresh shortly.";

    switch (progressState.currentIndex) {
      case 0:
        return "Please wait while we start the verification check.";
      case 1:
        return "Send the memo exactly as shown in the QR code.";
      case 2:
        return "Memo detected. Please wait while we prepare and send your OTP.";
      case 3:
        return "The one-time passcode may take a few minutes to arrive";
      default:
        return "Please wait.";
    }
  }, [otpInlineSuccess, pollError, progressState.currentIndex]);

  const progressBarClass = otpInlineSuccess ? "bg-green-600" : "bg-blue-500";
  const statusSeconds = Math.max(0, Math.floor(pollElapsedMs / 1000));
  const statusLine = pollError ? pollError : `Verifying - ${statusSeconds}s`;

  const handleInlineOtpSuccess = () => {
    setOtpInlineSuccess(true);
    setTimeout(() => {
      window.location.reload();
    }, 900);
  };

  return {
    startPolling,
    progressSteps,
    progressState,
    progressPercent,
    progressBarClass,
    statusSeconds,
    statusLine,
    otpPhaseSteps,
    showOtpPhaseLine,
    progressExplainer,
    handleInlineOtpSuccess,
  };
}
