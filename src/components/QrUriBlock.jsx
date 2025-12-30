import React, { useRef, useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function QrUriBlock({ uri, profileName, forceShowQR, forceShowURI }) {
  const qrRef = useRef(null);
  const [showQR, setShowQR] = useState(false);
  const [showFull, setShowFull] = useState(false);

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
    const viewBox = clone.getAttribute("viewBox");
    const widthAttr = clone.getAttribute("width") || "300";
    const heightAttr = clone.getAttribute("height") || "300";
    const width = parseInt(widthAttr, 10) || 300;
    const height = parseInt(heightAttr, 10) || 300;

    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const canvasWidth = viewBox ? parseInt(viewBox.split(/\s+/)[2], 10) || width : width;
      const canvasHeight = viewBox ? parseInt(viewBox.split(/\s+/)[3], 10) || height : height;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;

        const link = document.createElement("a");
        const safeName = (profileName || "recipient")
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-");
        const url = URL.createObjectURL(pngBlob);

        link.download = `zcashme-${safeName}-qr.png`;
        link.href = url;
        link.click();

        URL.revokeObjectURL(url);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }, "image/png");

      URL.revokeObjectURL(svgUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
    };

    img.src = svgUrl;
  };

  if (!uri) return null;

  return (
    <div className="flex flex-col items-center gap-4 mt-6 animate-fadeIn">

      {/* Always-centered toggle row */}
      <div className="flex gap-6 justify-center w-full">

        {/* QR toggle */}
        {!showQR && (
          <button
            onClick={() => setShowQR(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            Show QR
          </button>
        )}
        {showQR && (
          <button
            onClick={() => setShowQR(false)}
            className="text-sm text-blue-600 hover:underline"
          >
            Hide QR
          </button>
        )}

        {/* URI toggle */}
        {!showFull && (
          <button
            onClick={() => setShowFull(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            Show URI
          </button>
        )}
        {showFull && (
          <button
            onClick={() => setShowFull(false)}
            className="text-sm text-blue-600 hover:underline"
          >
            Hide URI
          </button>
        )}

      </div>

      {/* QR block */}
      {showQR && (
        <div className="flex flex-col items-center gap-2">
          <QRCodeSVG
            ref={qrRef}
            value={uri}
            size={300}
            includeMargin={true}
            bgColor="transparent"
            fgColor="#000000"
          />
          <button
            onClick={handleSaveQR}
            className={
              saved ? "text-sm text-green-600" : "text-sm text-blue-600 hover:underline"
            }
          >
            {saved ? "Saved" : "Save QR"}
          </button>
        </div>
      )}

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
          <button
            onClick={handleCopy}
            className={
              copied ? "text-sm text-green-600" : "text-sm text-blue-600 hover:underline"
            }
          >
            {copied ? "Copied" : "Copy URI"}
          </button>
        </div>
      )}

    </div>
  );
}
