"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Profile } from "@/lib/profile/types";
import QrUriBlock from "@/ui/verification/QrUriBlock";
import Alert from "@/ui/common/feedback/Alert";
import {
  checkWaitlistReservationAction,
  type ReserveSession,
} from "@/lib/zns/reserve";
import { normalizeZnsName } from "@/lib/zns/name";

interface ProfileReservationQrProps {
  profile: Profile;
  session: ReserveSession;
  onSessionChange?: (session: ReserveSession) => void;
  onQrReady?: () => void;
}

export default function ProfileReservationQr({
  profile,
  session,
  onSessionChange,
  onQrReady,
}: ProfileReservationQrProps) {
  const name = normalizeZnsName(session.name || profile.name || "");
  const [hasSentPayment, setHasSentPayment] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const lastShowQrSectionRef = useRef(false);
  const shouldReduceMotion = useReducedMotion() ?? false;
  const tapProps = shouldReduceMotion
    ? {}
    : {
        whileTap: { scale: 0.94, y: 1, filter: "brightness(0.95)" },
        transition: { type: "spring" as const, stiffness: 550, damping: 24, mass: 0.35 },
      };

  const uri = session.uri || "";
  const showQrSection = Boolean(uri) && !session.reserved;
  const qrSectionClasses = showQrSection || hasSentPayment || session.reserved
    ? "mt-1 pt-1 max-h-[1200px] opacity-100"
    : "max-h-0 opacity-0";

  useEffect(() => {
    const wasVisible = lastShowQrSectionRef.current;
    if (!wasVisible && showQrSection) {
      onQrReady?.();
    }
    lastShowQrSectionRef.current = showQrSection;
  }, [onQrReady, showQrSection]);

  const handleTogglePaymentDetails = useCallback((next: boolean) => {
    setError("");
    setHasSentPayment(!next);
  }, []);

  useEffect(() => {
    if (!hasSentPayment || session.reserved) return;

    let cancelled = false;
    setChecking(true);
    setError("");

    void (async () => {
      try {
        const next = await checkWaitlistReservationAction(profile.id);
        if (cancelled) return;
        if (!next.ok) {
          setError(next.error || "Could not check reservation.");
          return;
        }
        onSessionChange?.(next);
      } catch {
        if (!cancelled) setError("Could not check reservation.");
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasSentPayment, profile.id, session.reserved, onSessionChange]);

  return (
    <div className="w-full bg-transparent border-none shadow-none p-0">
      {error && !hasSentPayment ? (
        <Alert variant="error" size="sm" message={error} className="mt-2" />
      ) : null}

      <div
        className={`w-full overflow-hidden transition-[max-height,opacity] duration-350 ease-out ${qrSectionClasses}`}
      >
        <AnimatePresence initial={false}>
          {!hasSentPayment && !session.reserved && (
            <motion.div
              key="reservation-qr-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0.1 }
                  : { duration: 0.3, ease: "easeOut" }
              }
              className="overflow-hidden"
            >
              <div className="flex justify-center mb-4">
                <QrUriBlock
                  uri={uri}
                  memoText={session.memo}
                  profileName={`${name}-reservation`}
                  recipientDisplayName={profile.display_name}
                  recipientUsername={profile.name}
                  qrTopHintText={`Send ${session.amountZec} ZEC with this memo to reserve ${name}.`}
                  qrTopHintDetails={[
                    "Do not edit the memo.",
                    "Access codes are sent by shielded memo to this profile address.",
                  ]}
                  qrTopHintToggleLabel="Help"
                  compactTopSpacing
                  bottomActionBar
                  showParsedFieldsToggleAction
                  showPaymentDetails={!hasSentPayment}
                  onTogglePaymentDetails={handleTogglePaymentDetails}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {(hasSentPayment || session.reserved) && (
            <motion.div
              key="reservation-status-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0.1 }
                  : { duration: 0.3, ease: "easeOut" }
              }
              className="overflow-hidden"
            >
              <div className="relative w-full max-w-[380px] mx-auto">
                {!session.reserved ? (
                  <motion.button
                    type="button"
                    onClick={() => {
                      setError("");
                      setHasSentPayment(false);
                    }}
                    {...tapProps}
                    className="absolute left-0 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center text-gray-700 transition-all duration-200 hover:text-[var(--color-brand-blue)] active:text-[var(--color-brand-blue)]"
                    aria-label="Back to payment details"
                    title="Back to payment details"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M15 18 9 12l6-6"
                      />
                    </svg>
                  </motion.button>
                ) : null}
                <div className="relative w-full max-w-[300px] mx-auto bg-transparent">
                  <div className="space-y-3 py-6 text-center">
                    {session.reserved ? (
                      <p className="text-sm font-semibold text-green-700">
                        Success! Reservation received for {name}.
                      </p>
                    ) : checking ? (
                      <p className="text-sm text-gray-700">Checking for your reservation payment…</p>
                    ) : (
                      <p className="text-sm text-gray-700">
                        Payment not detected yet. Send the ZIP-321 payment, then try I Sent It again.
                      </p>
                    )}
                    {error ? (
                      <Alert variant="error" size="sm" message={error} className="mt-2" />
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
