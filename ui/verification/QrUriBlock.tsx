import { useRef, useState, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { INLINE_ACTION_BUTTON_CLASSES, OUTLINE_ACTION_BUTTON_CLASSES } from "@/ui/common/buttons/styles";

interface QrUriBlockProps {
  uri: string;
  profileName?: string;
  qrTopHintText?: string;
  qrTopHintDetails?: string[];
  qrTopHintToggleLabel?: string;
  qrHintText?: string;
  compactTopSpacing?: boolean;
  forceShowQR?: boolean;
  forceShowURI?: boolean;
  defaultShowQR?: boolean;
  defaultShowURI?: boolean;
  actionButtonClassName?: string;
  hideButtonClassName?: string;
}

export default function QrUriBlock({
  uri,
  profileName,
  qrTopHintText,
  qrTopHintDetails,
  qrTopHintToggleLabel,
  qrHintText,
  compactTopSpacing = false,
  forceShowQR,
  forceShowURI,
  defaultShowQR = true,
  defaultShowURI = false,
  actionButtonClassName,
  hideButtonClassName,
}: QrUriBlockProps) {
  const qrRef = useRef<SVGSVGElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const hintTransitionClasses = shouldReduceMotion ? "duration-100" : "duration-300 ease-in-out";
  const [showQR, setShowQR] = useState(defaultShowQR);
  const [showFull, setShowFull] = useState(defaultShowURI);
  const [showTopHintDetails, setShowTopHintDetails] = useState(false);
  const hasTopHintDetails = (qrTopHintDetails?.length ?? 0) > 0;
  const tapProps = shouldReduceMotion
    ? {}
    : {
        whileTap: { scale: 0.94, y: 1, filter: "brightness(0.95)" },
        transition: { type: "spring" as const, stiffness: 550, damping: 24, mass: 0.35 },
      };

  useEffect(() => {
    if (forceShowQR) setShowQR(true);
  }, [forceShowQR]);

  useEffect(() => {
    if (forceShowURI) setShowFull(true);
  }, [forceShowURI]);

  useEffect(() => {
    if (!hasTopHintDetails && showTopHintDetails) setShowTopHintDetails(false);
  }, [hasTopHintDetails, showTopHintDetails]);

  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(uri);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveQR = () => {
    const svg = qrRef.current;
    if (!svg) return;

    const clone = svg.cloneNode(true) as SVGSVGElement;
    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    const safeName = (profileName ?? "recipient")
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");

    link.download = `zcashme-${safeName}-qr.svg`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  if (!uri) return null;

  const actionButtonClasses =
    actionButtonClassName ??
    OUTLINE_ACTION_BUTTON_CLASSES;
  const hideButtonClasses =
    hideButtonClassName ??
    INLINE_ACTION_BUTTON_CLASSES;

  return (
    <div className={`flex flex-col items-center gap-4 ${compactTopSpacing ? "mt-0" : "mt-6"} animate-fadeIn`}>

      {/* QR block */}
      <AnimatePresence initial={false}>
        {showQR && (
          <motion.div
            key="qr-block"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex w-full max-w-full flex-col items-center gap-2 overflow-hidden"
          >
            {qrTopHintText && (
              <div className="mb-1 flex flex-col items-center text-center text-sm font-semibold text-[var(--color-brand-blue)]">
                <div className="inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5">
                  <span>{qrTopHintText}</span>
                  {hasTopHintDetails && (
                    <button
                      type="button"
                      onClick={() => setShowTopHintDetails((prev) => !prev)}
                      aria-expanded={showTopHintDetails}
                      className="ml-1 inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-[var(--color-brand-blue)] hover:underline"
                    >
                      <span>{showTopHintDetails ? "Hide" : (qrTopHintToggleLabel ?? "Tips")}</span>
                      <span
                        aria-hidden
                        className={`inline-block transition-transform ${hintTransitionClasses} ${showTopHintDetails ? "rotate-180" : "rotate-0"}`}
                      >
                        {"\u25BE"}
                      </span>
                    </button>
                  )}
                </div>
                {hasTopHintDetails && (
                  <div
                    aria-hidden={!showTopHintDetails}
                    className={`overflow-hidden text-xs font-normal text-gray-700 transition-all ${hintTransitionClasses} ${
                      showTopHintDetails ? "mt-1 max-h-24 opacity-100" : "mt-0 max-h-0 opacity-0"
                    }`}
                  >
                    <div
                      className={`space-y-0.5 transition-transform ${hintTransitionClasses} ${
                        showTopHintDetails ? "translate-y-0" : "-translate-y-1"
                      }`}
                    >
                      {qrTopHintDetails?.map((line, i) => (
                        <div key={`top-hint-${i}`}>{line}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <motion.a
              href={uri}
              {...tapProps}
              className="inline-block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)] focus-visible:ring-offset-2"
              title="Open payment URI"
              aria-label="Open payment URI"
            >
              <QRCodeSVG
                ref={qrRef}
                value={uri}
                size={300}
                includeMargin={true}
                bgColor="transparent"
                fgColor="#000000"
                style={{ width: "min(300px, 100%)", height: "auto" }}
              />
            </motion.a>
            {qrHintText && (
              <p className="-mt-5 text-center text-xs text-gray-600">
                {qrHintText}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR + URI controls row */}
      <div
        className={`flex flex-wrap items-center justify-center gap-3 w-max max-w-full ${
          !showQR ? "mt-4" : ""
        }`}
      >
        {showQR ? (
          <div className="flex items-center gap-0">
            <motion.button
              onClick={handleSaveQR}
              {...tapProps}
              className={actionButtonClasses}
            >
              {saved ? "Saved" : "Save QR"}
            </motion.button>
            <motion.button
              onClick={() => setShowQR(false)}
              {...tapProps}
              className={hideButtonClasses}
            >
              —Hide
            </motion.button>
          </div>
        ) : (
          <motion.button
            onClick={() => setShowQR(true)}
            {...tapProps}
            className={actionButtonClasses}
          >
            Show QR
          </motion.button>
        )}

        {showFull ? (
          <div className="flex items-center gap-0">
            <motion.button
              onClick={handleCopy}
              {...tapProps}
              className={actionButtonClasses}
            >
              {copied ? "Copied" : "Copy URI"}
            </motion.button>
            <motion.button
              onClick={() => setShowFull(false)}
              {...tapProps}
              className={hideButtonClasses}
            >
              —Hide
            </motion.button>
          </div>
        ) : (
          <motion.button
            onClick={() => setShowFull(true)}
            {...tapProps}
            className={actionButtonClasses}
          >
            Show URI
          </motion.button>
        )}
      </div>

      {/* URI block */}
      <AnimatePresence initial={false}>
        {showFull && (
          <motion.div
            key="uri-block"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex w-full max-w-full flex-col items-center gap-2 overflow-hidden"
          >
            <a
              href={uri}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full max-w-full text-center text-[var(--color-brand-blue)] underline break-all text-sm"
            >
              {uri}
            </a>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
