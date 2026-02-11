import { useRef, useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";

interface QrUriBlockProps {
  uri: string;
  profileName?: string;
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
  forceShowQR,
  forceShowURI,
  defaultShowQR = true,
  defaultShowURI = true,
  actionButtonClassName,
  hideButtonClassName,
}: QrUriBlockProps) {
  const qrRef = useRef<SVGSVGElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [showQR, setShowQR] = useState(defaultShowQR);
  const [showFull, setShowFull] = useState(defaultShowURI);
  const tapProps = shouldReduceMotion
    ? {}
    : {
        whileTap: { scale: 0.94, y: 1, filter: "brightness(0.95)" },
        transition: { type: "spring", stiffness: 550, damping: 24, mass: 0.35 },
      };

  useEffect(() => {
    if (forceShowQR) setShowQR(true);
  }, [forceShowQR]);

  useEffect(() => {
    if (forceShowURI) setShowFull(true);
  }, [forceShowURI]);

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
    "flex items-center gap-1 border rounded-xl px-3 py-2 text-md transition-all duration-200 border-gray-800 hover:border-blue-500 text-gray-700 whitespace-nowrap";
  const hideButtonClasses =
    hideButtonClassName ??
    "flex items-center gap-1 px-3 pl-0 py-2 text-md transition-all duration-200 text-gray-700 hover:text-blue-500 whitespace-nowrap";

  return (
    <div className="flex flex-col items-center gap-4 mt-6 animate-fadeIn">

      {/* QR block */}
      <div className="flex flex-col items-center gap-2">
        {showQR && (
          <QRCodeSVG
            ref={qrRef}
            value={uri}
            size={300}
            includeMargin={true}
            bgColor="transparent"
            fgColor="#000000"
          />
        )}
      </div>

      {/* QR + URI controls row */}
      <div className="flex flex-wrap items-center justify-center gap-3 w-full">
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
      {showFull && (
        <div className="flex flex-col items-center gap-2">
          <a
            href={uri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline break-all text-sm"
          >
            {uri}
          </a>
        </div>
      )}

    </div>
  );
}
