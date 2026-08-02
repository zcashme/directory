import { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  OUTLINE_ACTION_BUTTON_CLASSES,
} from "@/ui/common/buttons/styles";

interface QrUriBlockProps {
  uri: string;
  memoText?: string;
  profileName?: string;
  qrTopHintText?: string;
  qrTopHintDetails?: string[];
  qrTopHintToggleLabel?: string;
  qrHintText?: string;
  qrHintDetails?: string[];
  qrHintToggleLabel?: string;
  showParsedFieldsWhenHintExpanded?: boolean;
  bottomActionBar?: boolean;
  showParsedFieldsToggleAction?: boolean;
  compactTopHintToQrSpacing?: boolean;
  compactTopSpacing?: boolean;
  forceShowQR?: boolean;
  defaultShowQR?: boolean;
  showPaymentDetails?: boolean;
  onTogglePaymentDetails?: (next: boolean) => void;
}

type CopyField = "address" | "amount" | "memo";

function decodeBase64UrlToUtf8(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const paddingLength =
      normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
    const padded = normalized + "=".repeat(paddingLength);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function ExpandIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

function RetractIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 3l-7 7" />
      <path d="M14 5v5h5" />
      <path d="M3 21l7-7" />
      <path d="M10 19v-5H5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v11" />
      <path d="M8 10l4 4 4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function OpenInNewIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 3h7v7" />
      <path d="M10 14 21 3" />
      <path d="M21 14v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h4" />
    </svg>
  );
}

function DetailsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ExpandedQrModal({
  uri,
  onClose,
  onSave,
  saved,
  tapProps,
}: {
  uri: string;
  onClose: () => void;
  onSave: () => void;
  saved: boolean;
  tapProps: Record<string, unknown>;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[10000] flex justify-center px-4 items-start sm:items-center pt-[10vh] sm:pt-0 overflow-y-auto">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />
      <div
        className="relative my-4 flex max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100vw-2rem)] items-center justify-center rounded-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ backgroundColor: "var(--color-background)" }}
      >
        <div className="flex max-h-[calc(100dvh-2rem)] w-full flex-col items-center p-4 sm:p-5">
          <div className="flex flex-col items-center gap-4">
            <a
              href={uri}
              className="inline-flex max-h-[calc(100dvh-10rem)] max-w-full p-2 sm:p-4"
              title="Open payment URI"
              aria-label="Open payment URI"
            >
              <QRCodeSVG
                value={uri}
                size={640}
                includeMargin={true}
                bgColor="transparent"
                fgColor="#000000"
                style={{
                  width: "min(calc(100vw - 5rem), calc(100dvh - 10rem), 640px)",
                  height: "auto",
                  maxHeight: "calc(100dvh - 10rem)",
                }}
              />
            </a>
            <div className="flex items-center justify-center gap-5">
              <motion.button
                type="button"
                onClick={onClose}
                {...tapProps}
                className="inline-flex h-10 w-10 items-center justify-center text-gray-700 transition-all duration-200 hover:text-[var(--color-brand-blue)] active:text-[var(--color-brand-blue)]"
                aria-label="Retract QR"
                title="Retract QR"
              >
                <RetractIcon />
              </motion.button>
              <motion.button
                type="button"
                onClick={() => window.open(uri, "_blank", "noopener,noreferrer")}
                {...tapProps}
                className="inline-flex h-10 w-10 items-center justify-center text-gray-700 transition-all duration-200 hover:text-[var(--color-brand-blue)] active:text-[var(--color-brand-blue)]"
                aria-label="Open payment URI"
                title="Open payment URI"
              >
                <OpenInNewIcon />
              </motion.button>
              <motion.button
                type="button"
                onClick={onSave}
                {...tapProps}
                className="inline-flex h-10 w-10 items-center justify-center text-gray-700 transition-all duration-200 hover:text-[var(--color-brand-blue)] active:text-[var(--color-brand-blue)]"
                aria-label={saved ? "QR saved" : "Save QR"}
                title={saved ? "QR saved" : "Save QR"}
              >
                <DownloadIcon />
              </motion.button>
              <motion.button
                type="button"
                onClick={onClose}
                {...tapProps}
                className="inline-flex h-10 w-10 items-center justify-center text-gray-700 transition-all duration-200 hover:text-[var(--color-brand-blue)] active:text-[var(--color-brand-blue)]"
                aria-label="Close modal"
                title="Close modal"
              >
                <CloseIcon />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PaymentDetailRow({
  label,
  value,
  title,
  onCopy,
  copied,
  tapProps,
}: {
  label: string;
  value: string;
  title: string;
  onCopy: () => void;
  copied: boolean;
  tapProps: Record<string, unknown>;
}) {
  const labelWidthClass = "w-[72px]";
  const contentWidthClass = "w-[248px]";

  return (
    <div className="mx-auto grid w-full max-w-[392px] grid-cols-[72px_248px_72px] items-center gap-0">
      <span className={`${labelWidthClass} pr-3 text-right text-sm text-gray-700`}>
        {label}
      </span>
      <div className={`relative min-w-0 ${contentWidthClass}`}>
        <p
          className="truncate rounded-xl border border-gray-800 bg-transparent px-3 py-[11px] pr-14 text-sm text-gray-900"
          title={value || title}
        >
          {value || title}
        </p>
        <motion.button
          type="button"
          onClick={onCopy}
          {...tapProps}
          className="absolute right-0 top-0 inline-flex h-full w-11 items-center justify-center text-gray-700 transition-all duration-200 hover:text-[var(--color-brand-blue)] active:text-[var(--color-brand-blue)]"
          aria-label={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
          title={copied ? `${label} copied` : `Copy ${label.toLowerCase()}`}
        >
          <CopyIcon copied={copied} />
        </motion.button>
      </div>
      <div aria-hidden className={labelWidthClass} />
    </div>
  );
}

export default function QrUriBlock({
  uri,
  memoText,
  profileName,
  qrTopHintText,
  qrTopHintDetails,
  qrTopHintToggleLabel,
  qrHintText,
  qrHintDetails,
  qrHintToggleLabel,
  showParsedFieldsWhenHintExpanded = false,
  bottomActionBar = false,
  showParsedFieldsToggleAction = false,
  compactTopHintToQrSpacing = false,
  compactTopSpacing = false,
  forceShowQR,
  defaultShowQR = true,
  showPaymentDetails,
  onTogglePaymentDetails,
}: QrUriBlockProps) {
  const qrRef = useRef<SVGSVGElement>(null);
  const shouldReduceMotion = useReducedMotion() ?? false;
  const hintTransitionClasses = shouldReduceMotion
    ? "duration-100"
    : "duration-300 ease-in-out";
  const tapProps = shouldReduceMotion
    ? {}
    : {
        whileTap: { scale: 0.94, y: 1, filter: "brightness(0.95)" },
        transition: {
          type: "spring" as const,
          stiffness: 550,
          damping: 24,
          mass: 0.35,
        },
      };
  const [showQR, setShowQR] = useState(defaultShowQR);
  const [showTopHintDetails, setShowTopHintDetails] = useState(false);
  const [showBottomHintDetails, setShowBottomHintDetails] = useState(false);
  const [showActionBarDetails, setShowActionBarDetails] = useState(
    bottomActionBar && showPaymentDetails === true
  );
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<CopyField | null>(null);
  const hasTopHintDetails = (qrTopHintDetails?.length ?? 0) > 0;
  const hasBottomHintDetails = (qrHintDetails?.length ?? 0) > 0;

  useEffect(() => {
    if (forceShowQR) setShowQR(true);
  }, [forceShowQR]);

  useEffect(() => {
    if (!hasTopHintDetails && showTopHintDetails) {
      setShowTopHintDetails(false);
    }
  }, [hasTopHintDetails, showTopHintDetails]);

  useEffect(() => {
    if (!hasBottomHintDetails && showBottomHintDetails) {
      setShowBottomHintDetails(false);
    }
  }, [hasBottomHintDetails, showBottomHintDetails]);

  useEffect(() => {
    if (bottomActionBar && showPaymentDetails === true) {
      setShowActionBarDetails(true);
      return;
    }

    if (bottomActionBar && showPaymentDetails === false) {
      setShowActionBarDetails(false);
    }
  }, [bottomActionBar, showPaymentDetails]);

  const useBottomActionBar = bottomActionBar;

  const {
    addressFromUri,
    amountFromUri,
    memoFromUriRaw,
    memoFromUriDecoded,
  } = useMemo(() => {
    const withoutScheme = uri.replace(/^zcash:/i, "");
    const [addressPart, queryPart = ""] = withoutScheme.split("?");
    const addressValue = addressPart.trim();
    const address = addressValue.length > 0 ? addressValue : null;
    const params = new URLSearchParams(queryPart);
    const amountValue = params.get("amount")?.trim();
    const memoValue = params.get("memo")?.trim();
    const amount = amountValue && amountValue.length > 0 ? amountValue : null;
    const memoRaw = memoValue && memoValue.length > 0 ? memoValue : null;
    const memoDecoded = memoRaw ? decodeBase64UrlToUtf8(memoRaw) : null;
    return {
      addressFromUri: address,
      amountFromUri: amount,
      memoFromUriRaw: memoRaw,
      memoFromUriDecoded: memoDecoded,
    };
  }, [uri]);

  const effectiveMemo =
    typeof memoText === "string" && memoText.trim().length > 0
      ? memoText.trim()
      : (memoFromUriDecoded ?? memoFromUriRaw ?? "");
  const amountDisplay = amountFromUri ? `${amountFromUri} ZEC` : "";

  const setCopiedState = (field: CopyField) => {
    setCopiedField(field);
    window.setTimeout(() => {
      setCopiedField((current) => (current === field ? null : current));
    }, 1500);
  };

  const handleCopyValue = async (field: CopyField, value: string) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedState(field);
    } catch {
      setCopiedField(null);
    }
  };

  const handleSaveQR = async () => {
    const svg = qrRef.current;
    if (!svg) return;

    const clone = svg.cloneNode(true) as SVGSVGElement;
    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    const safeName = (profileName ?? "recipient")
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");

    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Failed to load QR image"));
        image.src = svgUrl;
      });

      const exportSize = 2048;
      const canvas = document.createElement("canvas");
      canvas.width = exportSize;
      canvas.height = exportSize;

      const context = canvas.getContext("2d");
      if (!context) return;

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, exportSize, exportSize);
      context.imageSmoothingEnabled = false;
      context.drawImage(image, 0, 0, exportSize, exportSize);

      const imageData = context.getImageData(0, 0, exportSize, exportSize);
      const pixels = imageData.data;
      for (let i = 0; i < pixels.length; i += 4) {
        const blackOrWhite = pixels[i] < 128 ? 0 : 255;
        pixels[i] = blackOrWhite;
        pixels[i + 1] = blackOrWhite;
        pixels[i + 2] = blackOrWhite;
        pixels[i + 3] = 255;
      }
      context.putImageData(imageData, 0, 0);

      const pngBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!pngBlob) return;

      const downloadUrl = URL.createObjectURL(pngBlob);
      const link = document.createElement("a");
      link.download = `zcashme-${safeName}-qr.png`;
      link.href = downloadUrl;
      link.click();
      URL.revokeObjectURL(downloadUrl);

      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
    } catch {
      // No-op: skip download if the browser cannot rasterize the SVG.
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };

  const handleOpenUri = () => {
    window.open(uri, "_blank", "noopener,noreferrer");
  };

  const handleToggleActionBarDetails = () => {
    if (showPaymentDetails === false && onTogglePaymentDetails) {
      onTogglePaymentDetails(true);
      return;
    }

    setShowActionBarDetails((prev) => !prev);
  };

  const primaryButtonClasses =
    `${OUTLINE_ACTION_BUTTON_CLASSES} justify-center px-3 py-2 ` +
    `bg-[var(--color-brand-blue)] border-[var(--color-brand-blue)] text-white ` +
    `hover:bg-[var(--color-brand-blue)]/90 hover:border-[var(--color-brand-blue)]/90 ` +
    `hover:!text-white active:!text-white font-bold`;

  if (!uri) return null;

  return (
    <>
      <div
        className={`flex flex-col items-center gap-4 ${
          compactTopSpacing ? "mt-0" : "mt-6"
        } animate-fadeIn`}
      >
        <AnimatePresence initial={false}>
          {showQR && (
            <motion.div
              key="qr-block"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex w-full max-w-full flex-col items-center ${
                compactTopHintToQrSpacing ? "gap-1" : "gap-2"
              } overflow-hidden`}
            >
              {qrTopHintText && (
                <div
                  className={`flex flex-col items-center text-center text-sm font-semibold text-[var(--color-brand-blue)] ${
                    compactTopHintToQrSpacing ? "mb-0" : "mb-1"
                  }`}
                >
                  <div className="inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5">
                    <span className="whitespace-pre-line">{qrTopHintText}</span>
                    {hasTopHintDetails && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowTopHintDetails((prev) => !prev)
                        }
                        aria-expanded={showTopHintDetails}
                        aria-label={
                          showTopHintDetails
                            ? `Hide ${qrTopHintToggleLabel ?? "help"}`
                            : (qrTopHintToggleLabel ?? "Help")
                        }
                        title={qrTopHintToggleLabel ?? "Help"}
                        className="ml-1 inline-flex"
                      >
                        <span
                          className={`inline-flex h-4 w-4 select-none items-center justify-center rounded-full border border-gray-400 text-[10px] font-bold text-gray-600 transition-colors ${
                            showTopHintDetails ? "bg-gray-100" : "bg-transparent hover:bg-gray-100"
                          }`}
                        >
                          ?
                        </span>
                      </button>
                    )}
                  </div>
                  {hasTopHintDetails && (
                    <div
                      aria-hidden={!showTopHintDetails}
                      className={`overflow-hidden text-xs font-normal text-gray-700 transition-all ${hintTransitionClasses} ${
                        showTopHintDetails
                          ? "mt-1 max-h-24 opacity-100"
                          : "mt-0 max-h-0 opacity-0"
                      }`}
                    >
                      <div
                        className={`space-y-0.5 transition-transform ${hintTransitionClasses} ${
                          showTopHintDetails
                            ? "translate-y-0"
                            : "-translate-y-1"
                        }`}
                      >
                        {qrTopHintDetails?.map((line, index) => (
                          <div key={`top-hint-${index}`}>{line}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {useBottomActionBar ? (
                <div className="flex w-full flex-col items-center gap-2">
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
                  <div className="flex items-center justify-center gap-5">
                    <motion.button
                      type="button"
                      onClick={() => setExpanded(true)}
                      {...tapProps}
                      className="inline-flex h-10 w-10 items-center justify-center text-gray-700 transition-all duration-200 hover:text-[var(--color-brand-blue)] active:text-[var(--color-brand-blue)]"
                      aria-label="Expand QR"
                      title="Expand QR"
                    >
                      <ExpandIcon />
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={handleOpenUri}
                      {...tapProps}
                      className="inline-flex h-10 w-10 items-center justify-center text-gray-700 transition-all duration-200 hover:text-[var(--color-brand-blue)] active:text-[var(--color-brand-blue)]"
                      aria-label="Open payment URI"
                      title="Open payment URI"
                    >
                      <OpenInNewIcon />
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={handleSaveQR}
                      {...tapProps}
                      className="inline-flex h-10 w-10 items-center justify-center text-gray-700 transition-all duration-200 hover:text-[var(--color-brand-blue)] active:text-[var(--color-brand-blue)]"
                      aria-label={saved ? "QR saved" : "Save QR"}
                      title={saved ? "QR saved" : "Save QR"}
                    >
                      <DownloadIcon />
                    </motion.button>
                    {showParsedFieldsToggleAction && (
                      <motion.button
                        type="button"
                        onClick={handleToggleActionBarDetails}
                        {...tapProps}
                        className="inline-flex h-10 w-10 items-center justify-center text-gray-700 transition-all duration-200 hover:text-[var(--color-brand-blue)] active:text-[var(--color-brand-blue)]"
                        aria-expanded={showActionBarDetails}
                        aria-label={showActionBarDetails ? "Hide payment details" : "Show payment details"}
                        title={showActionBarDetails ? "Hide payment details" : "Show payment details"}
                      >
                        <DetailsIcon />
                      </motion.button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid w-full max-w-[404px] grid-cols-[52px_minmax(0,1fr)_52px] items-start justify-center gap-3">
                  <div aria-hidden className="h-full" />
                  <div className="flex flex-col items-center">
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
                  </div>
                  <div className="flex h-[300px] flex-col items-end justify-between">
                    <motion.button
                      type="button"
                      onClick={() => setExpanded(true)}
                      {...tapProps}
                      className="inline-flex h-12 w-12 items-center justify-center text-gray-700 transition-all duration-200 hover:text-[var(--color-brand-blue)] active:text-[var(--color-brand-blue)]"
                      aria-label="Expand QR"
                      title="Expand QR"
                    >
                      <ExpandIcon />
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={handleSaveQR}
                      {...tapProps}
                      className="inline-flex h-12 w-12 items-center justify-center text-gray-700 transition-all duration-200 hover:text-[var(--color-brand-blue)] active:text-[var(--color-brand-blue)]"
                      aria-label={saved ? "QR saved" : "Save QR"}
                      title={saved ? "QR saved" : "Save QR"}
                    >
                      <DownloadIcon />
                    </motion.button>
                  </div>
                </div>
              )}

              {qrHintText && !hasBottomHintDetails && !useBottomActionBar && (
                <p className="-mt-5 text-center text-xs text-gray-600">
                  {qrHintText}
                </p>
              )}

              {hasBottomHintDetails && !useBottomActionBar && (
                <div className="-mt-5 flex w-full flex-col items-center text-center text-xs text-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowBottomHintDetails((prev) => !prev)}
                    aria-expanded={showBottomHintDetails}
                    className="inline-flex items-center gap-1 font-semibold hover:text-gray-700 hover:underline"
                  >
                    <span>{showBottomHintDetails ? "Hide" : (qrHintToggleLabel ?? "Help")}</span>
                    <span
                      aria-hidden
                      className={`inline-block transition-transform ${hintTransitionClasses} ${
                        showBottomHintDetails ? "rotate-180" : "rotate-0"
                      }`}
                    >
                      {"\u25BE"}
                    </span>
                  </button>
                  <div
                    aria-hidden={!showBottomHintDetails}
                    className={`overflow-hidden transition-all ${hintTransitionClasses} ${
                      showBottomHintDetails
                        ? "mt-1 max-h-24 opacity-100"
                        : "mt-0 max-h-0 opacity-0"
                    }`}
                  >
                    <div
                      className={`space-y-0.5 transition-transform ${hintTransitionClasses} ${
                        showBottomHintDetails
                          ? "translate-y-0"
                          : "-translate-y-1"
                      }`}
                    >
                      {qrHintDetails?.map((line, index) => (
                        <div key={`bottom-hint-${index}`}>{line}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <AnimatePresence initial={false}>
                {showParsedFieldsWhenHintExpanded && showBottomHintDetails && !useBottomActionBar && (
                  <motion.div
                    key="hint-payment-details"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="w-full overflow-hidden"
                  >
                    <div className="mt-3 w-full space-y-3">
                      <PaymentDetailRow
                        label="Address"
                        value={addressFromUri ?? ""}
                        title="No address"
                        onCopy={() =>
                          void handleCopyValue(
                            "address",
                            addressFromUri ?? ""
                          )
                        }
                        copied={copiedField === "address"}
                        tapProps={tapProps}
                      />
                      <PaymentDetailRow
                        label="Amount"
                        value={amountDisplay}
                        title="No amount"
                        onCopy={() =>
                          void handleCopyValue("amount", amountDisplay)
                        }
                        copied={copiedField === "amount"}
                        tapProps={tapProps}
                      />
                      <PaymentDetailRow
                        label="Memo"
                        value={effectiveMemo}
                        title="No memo"
                        onCopy={() =>
                          void handleCopyValue("memo", effectiveMemo)
                        }
                        copied={copiedField === "memo"}
                        tapProps={tapProps}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {useBottomActionBar &&
                  showPaymentDetails !== true &&
                  showActionBarDetails && (
                  <motion.div
                    key="actionbar-payment-details"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="w-full overflow-hidden"
                  >
                    <div className="mt-3 w-full space-y-3">
                      <PaymentDetailRow
                        label="Address"
                        value={addressFromUri ?? ""}
                        title="No address"
                        onCopy={() =>
                          void handleCopyValue(
                            "address",
                            addressFromUri ?? ""
                          )
                        }
                        copied={copiedField === "address"}
                        tapProps={tapProps}
                      />
                      <PaymentDetailRow
                        label="Amount"
                        value={amountDisplay}
                        title="No amount"
                        onCopy={() =>
                          void handleCopyValue("amount", amountDisplay)
                        }
                        copied={copiedField === "amount"}
                        tapProps={tapProps}
                      />
                      <PaymentDetailRow
                        label="Memo"
                        value={effectiveMemo}
                        title="No memo"
                        onCopy={() =>
                          void handleCopyValue("memo", effectiveMemo)
                        }
                        copied={copiedField === "memo"}
                        tapProps={tapProps}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {showPaymentDetails === true && (
            <motion.div
              key="payment-details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full overflow-hidden"
            >
              <div className="flex w-full flex-col items-center gap-3">
                <AnimatePresence initial={false}>
                  {(!useBottomActionBar || showActionBarDetails) && (
                    <motion.div
                      key="verification-payment-details"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="w-full overflow-hidden"
                    >
                      <div className="w-full space-y-3">
                        <PaymentDetailRow
                          label="Address"
                          value={addressFromUri ?? ""}
                          title="No address"
                          onCopy={() =>
                            void handleCopyValue(
                              "address",
                              addressFromUri ?? ""
                            )
                          }
                          copied={copiedField === "address"}
                          tapProps={tapProps}
                        />
                        <PaymentDetailRow
                          label="Amount"
                          value={amountDisplay}
                          title="No amount"
                          onCopy={() =>
                            void handleCopyValue("amount", amountDisplay)
                          }
                          copied={copiedField === "amount"}
                          tapProps={tapProps}
                        />
                        <PaymentDetailRow
                          label="Memo"
                          value={effectiveMemo}
                          title="No memo"
                          onCopy={() =>
                            void handleCopyValue("memo", effectiveMemo)
                          }
                          copied={copiedField === "memo"}
                          tapProps={tapProps}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.button
                  type="button"
                  onClick={() => onTogglePaymentDetails?.(false)}
                  disabled={!onTogglePaymentDetails}
                  {...tapProps}
                  className={`${primaryButtonClasses} mx-auto w-full max-w-[248px]`}
                >
                  I Sent It!
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {expanded && (
          <ExpandedQrModal
            uri={uri}
            onClose={() => setExpanded(false)}
            onSave={handleSaveQR}
            saved={saved}
            tapProps={tapProps}
          />
        )}
      </AnimatePresence>
    </>
  );
}
