"use client";

import { useEffect, useState } from "react";
import { getRefundDataAction } from "@/lib/directory/getRefundDataAction";
import { QRCodeSVG } from "qrcode.react"; // identical lib used in QrUriBlock

function rebuildUri(rawUri) {
  try {
    const url = new URL(rawUri.replace("zcash:", "https://zcash.local/"));

    const address = rawUri.split(":")[1].split("?")[0]; // extract address manually

    const amount = url.searchParams.get("amount") || "";
    let memo = url.searchParams.get("memo") || "";

    const memoClean = encodeURIComponent(decodeURIComponent(memo));

    const parts = [];
    if (amount) parts.push(`amount=${amount}`);
    if (memoClean) parts.push(`memo=${memoClean}`);

    return `zcash:${address}${parts.length ? "?" + parts.join("&") : ""}`;
  } catch (e) {
    return rawUri; // fallback
  }
}

export default function AdminRefunds() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [showQR, setShowQR] = useState({}); // per-row toggle

  async function load() {
    const result = await getRefundDataAction();

    if (!result.ok) {
      setError(result.error || "Failed to load refund data");
      return;
    }

    setRows(result.data || []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ marginBottom: "20px" }}>Refund URI Checklist</h1>

      {error && (
        <div style={{ color: "red", marginBottom: "10px" }}>
          Error loading data: {error}
        </div>
      )}

      <table
        border="1"
        cellPadding="6"
        cellSpacing="0"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr style={{ background: "#eee" }}>
            <th style={{ width: "40px" }}>✔</th>
            <th style={{ width: "40%" }}>Message → URI</th>
            <th style={{ width: "200px" }}>QR</th>
            <th style={{ width: "35%" }}>Twitter Link</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => {
            const rebuilt = rebuildUri(r.zip321_uri); // FIX APPLIED HERE

            return (
              <tr key={r.txid}>
                {/* Checkbox */}
                <td style={{ textAlign: "center" }}>
                  <input type="checkbox" />
                </td>

                {/* Message → URI */}
                <td style={{ wordBreak: "break-word", whiteSpace: "normal" }}>
                  <a
                    href={rebuilt}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#0066cc", textDecoration: "underline" }}
                  >
                    {r.outgoing_message || "(no message)"}
                  </a>
                </td>

                {/* Display the URI length for debugging */}
                <pre>{rebuilt.length}</pre>

                {/* QR (lazy render) */}
                <td style={{ textAlign: "center" }}>
                  {!showQR[r.txid] ? (
                    <button
                      onClick={() =>
                        setShowQR((prev) => ({ ...prev, [r.txid]: true }))
                      }
                      style={{
                        padding: "6px 12px",
                        cursor: "pointer",
                        borderRadius: "6px",
                        background: "#ddd",
                        border: "1px solid #aaa",
                      }}
                    >
                      Show QR
                    </button>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <QRCodeSVG
                        value={rebuilt} // FIXED: rebuilt URI
                        size={512}       // matches QrUriBlock
                        includeMargin={true}
                        bgColor="transparent"
                        fgColor="#000000"
                      />
                      <button
                        onClick={() =>
                          setShowQR((prev) => ({ ...prev, [r.txid]: false }))
                        }
                        style={{
                          padding: "4px 8px",
                          cursor: "pointer",
                          borderRadius: "6px",
                          background: "#f5f5f5",
                          border: "1px solid #aaa",
                          fontSize: "12px",
                        }}
                      >
                        Hide QR
                      </button>
                    </div>
                  )}
                </td>

                {/* Twitter */}
                <td style={{ textAlign: "center", wordBreak: "break-word" }}>
                  {r.twitter_url ? (
                    <a
                      href={
                        r.twitter_url.startsWith("http")
                          ? r.twitter_url
                          : "https://" + r.twitter_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#0066cc", textDecoration: "underline" }}
                    >
                      {r.twitter_url}
                    </a>
                  ) : (
                    ""
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

