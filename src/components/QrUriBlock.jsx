import React, { useRef, useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function QrUriBlock({ uri, profileName, forceShowQR, forceShowURI }) {
  const qrRef = useRef(null);
  const [showQR, setShowQR] = useState(true);
  const [showFull, setShowFull] = useState(true);

  useEffect(() => {
    if (forceShowQR) setShowQR(true);
  }, [forceShowQR]);

  useEffect(() => {
    if (forceShowURI) setShowFull(true);
  }, [forceShowURI]);

  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(uri);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveQR = () => {
    const svg = qrRef.current;
    if (!svg) return;

    const clone = svg.cloneNode(true);
    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    const safeName = (profileName || "recipient")
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
    "flex items-center gap-1 border rounded-xl px-3 py-2 text-md transition-all duration-200 border-gray-800 hover:border-blue-500 text-gray-700 whitespace-nowrap";
  const hideButtonClasses =
    "flex items-center gap-1 px-3 py-2 text-md transition-all duration-200 text-gray-700 hover:text-blue-500 whitespace-nowrap";

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
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveQR}
              className={actionButtonClasses}
            >
              {saved ? "Saved" : "Save QR"}
            </button>
            <button
              onClick={() => setShowQR(false)}
              className={hideButtonClasses}
            >
              Hide
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowQR(true)}
            className={actionButtonClasses}
          >
            Show QR
          </button>
        )}

        {showFull ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className={actionButtonClasses}
            >
              {copied ? "Copied" : "Copy URI"}
            </button>
            <button
              onClick={() => setShowFull(false)}
              className={hideButtonClasses}
            >
              Hide
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowFull(true)}
            className={actionButtonClasses}
          >
            Show URI
          </button>
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
