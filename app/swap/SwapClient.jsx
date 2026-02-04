"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

function shortAddr(a) {
  if (!a) return "";
  if (a.length <= 12) return a;
  return `${a.slice(0, 3)}...${a.slice(-6)}`;
}

function fmtUsd(x) {
  if (x === null || x === undefined || x === "") return "—";
  const n = Number(x);
  if (!Number.isFinite(n)) return String(x);
  return `$${n.toFixed(2)}`;
}

async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return await r.json();
}

export default function SwapClient() {
  // tokens
  const [tokens, setTokens] = useState([]);
  const [fromToken, setFromToken] = useState("");
  const [toToken, setToToken] = useState("");

  // form
  const [amountIn, setAmountIn] = useState("");
  const [destAddress, setDestAddress] = useState("");
  const [refundAddress, setRefundAddress] = useState("");
  const [slippageTolerance, setSlippageTolerance] = useState("50");

  // api results / ui state
  const [raw, setRaw] = useState(null);
  const [notice, setNotice] = useState(null); // { type: "info"|"error"|"success"|"warning", msg: string }
  const [quotePretty, setQuotePretty] = useState(null); // normalized display block from /quote
  const [confirmData, setConfirmData] = useState(null); // { swapId, deposit, paymentUri, ... }
  const [isQuoting, setIsQuoting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // polling control
  const pollTokenRef = useRef(0);

  const fromLabel = useMemo(() => {
    const t = tokens.find((x) => x.id === fromToken);
    return t ? `${t.symbol || t.ticker || t.id} (${t.chain || t.network || "?"})` : fromToken;
  }, [tokens, fromToken]);

  const toLabel = useMemo(() => {
    const t = tokens.find((x) => x.id === toToken);
    return t ? `${t.symbol || t.ticker || t.id} (${t.chain || t.network || "?"})` : toToken;
  }, [tokens, toToken]);

  function resetSession() {
    setConfirmData(null);
    pollTokenRef.current += 1; // stop any existing polls
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  function normalizeTokensPayload(j) {
    const data = j?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.tokens)) return data.tokens;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }

  async function loadTokens() {
    setNotice({ type: "info", msg: "Loading tokens…" });
    const r = await fetch("/api/swap/tokens");
    const j = await r.json();
    setRaw(j);

    if (!j?.ok) {
      setNotice({ type: "error", msg: j?.error || "Failed to load tokens." });
      return;
    }

    const list = normalizeTokensPayload(j);
    if (!list.length) {
      setNotice({ type: "error", msg: "No tokens returned from /api/swap/tokens" });
      return;
    }

    // normalize each token for UI
    const normalized = list.map((t) => {
      const id = t.id || t.tokenId || t.assetId || t.asset || t.symbol;
      const symbol = t.symbol || t.ticker || id;
      const chain = t.chain || t.network || t.originChain || "?";
      return { ...t, id, symbol, chain };
    });

    setTokens(normalized);

    // default select first token
    const first = normalized[0]?.id || "";
    setFromToken((prev) => prev || first);
    setToToken((prev) => prev || first);

    setNotice(null);
  }

  useEffect(() => {
    loadTokens().catch((e) => {
      setRaw({ ok: false, error: String(e) });
      setNotice({ type: "error", msg: String(e) });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onQuote() {
    resetSession();
    setQuotePretty(null);
    setIsQuoting(true);

    const body = {
      fromToken,
      toToken,
      amountIn: amountIn.trim(),
      destAddress: destAddress.trim(),
      refundAddress: refundAddress.trim(),
      slippageTolerance: slippageTolerance.trim(),
    };

    try {
      const j = await postJSON("/api/swap/quote", body);
      setRaw(j);

      if (!j?.ok) {
        setNotice({ type: "error", msg: j?.error || "Quote failed." });
        return;
      }

      setQuotePretty({
        from: fromLabel,
        to: toLabel,
        fromSymbol: j?.display?.fromSymbol,
        toSymbol: j?.display?.toSymbol,
        amountInFormatted: j?.display?.amountInFormatted,
        amountOutFormatted: j?.display?.amountOutFormatted,
        amountInUsd: j?.display?.amountInUsd,
        amountOutUsd: j?.display?.amountOutUsd,
      });

      setNotice({ type: "info", msg: "Quote ready. Press Confirm to show the QR code." });
    } catch (e) {
      setNotice({ type: "error", msg: String(e) });
      setRaw({ ok: false, error: String(e) });
    } finally {
      setIsQuoting(false);
    }
  }

  async function onConfirm() {
    setIsConfirming(true);
    pollTokenRef.current += 1; // stop any existing polls

    const body = {
      fromToken,
      toToken,
      amountIn: amountIn.trim(),
      destAddress: destAddress.trim(),
      refundAddress: refundAddress.trim(),
      slippageTolerance: slippageTolerance.trim(),
    };

    try {
      const j = await postJSON("/api/swap/confirm", body);
      setRaw(j);

      if (!j?.ok) {
        setNotice({ type: "error", msg: j?.error || "Confirm failed." });
        return;
      }

      setConfirmData(j);
      setQuotePretty(null);
      setNotice({ type: "info", msg: "Scan the QR code with your wallet and pay." });

      // start polling using deposit fields (NOT swapId)
      const depositAddress = j?.deposit?.address || "";
      const depositMemo = j?.deposit?.memo || "";

      if (!depositAddress) {
        setNotice({ type: "error", msg: "Confirm succeeded but deposit address is missing." });
        return;
      }

      pollStatus({ depositAddress, depositMemo }).catch(() => {});
    } catch (e) {
      setNotice({ type: "error", msg: String(e) });
      setRaw({ ok: false, error: String(e) });
    } finally {
      setIsConfirming(false);
    }
  }

  async function pollStatus({ depositAddress, depositMemo }) {
    const myToken = ++pollTokenRef.current;
    const stopStates = new Set(["SUCCESS", "FAILED", "REFUNDED"]);

    while (myToken === pollTokenRef.current) {
      const qs = new URLSearchParams();
      qs.set("depositAddress", depositAddress);
      if (depositMemo) qs.set("depositMemo", depositMemo);

      const r = await fetch(`/api/swap/status?${qs.toString()}`);
      const j = await r.json();
      setRaw(j);

      // if backend says retryable, keep polling; otherwise stop
      if (j?.ok === false && !j?.retryable) {
        setNotice({ type: "error", msg: j?.error || "Swap status failed." });
        return;
      }

      const status =
        j?.status?.status ||
        j?.status?.data?.status ||
        j?.status?.quote?.status ||
        j?.status?.data?.quote?.status;

      if (status) {
        if (stopStates.has(status)) {
          setNotice({
            type: status === "SUCCESS" ? "success" : "error",
            msg: `Swap status: ${status}`,
          });
          return;
        }
        setNotice({ type: "info", msg: `Swap status: ${status}` });
      } else if (j?.retryable) {
        setNotice({ type: "warning", msg: "Swap status temporarily unavailable; retrying…" });
      }

      await new Promise((res) => setTimeout(res, 6000));
    }
  }

  const qrValue = useMemo(() => {
    const uri = (confirmData?.paymentUri || "").trim();
    const addr = (confirmData?.deposit?.address || "").trim();
    return uri || addr || "";
  }, [confirmData]);

  const depositAddr = (confirmData?.deposit?.address || "").trim();
  const depositAmount = (confirmData?.deposit?.amountDecimal || "").trim();

  return (
    <div className="swap-shell">
      <header className="swap-header">
        <div>
          <div className="swap-eyebrow">NEAR Intents</div>
          <h1 className="swap-title">Swap</h1>
          <p className="swap-subtitle">Get Quote → Confirm → Pay from your mobile wallet → Track execution.</p>
        </div>
        <span className="badge pending swap-badge">Beta</span>
      </header>

      <section className="card swap-card">
        <div className="swap-grid">
          <div className="form-group">
            <label className="form-label">From</label>
            <select className="input" value={fromToken} onChange={(e) => setFromToken(e.target.value)}>
              {tokens.map((t) => (
                <option key={`from-${t.id}`} value={t.id}>
                  {t.symbol} ({t.chain})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">To</label>
            <select className="input" value={toToken} onChange={(e) => setToToken(e.target.value)}>
              {tokens.map((t) => (
                <option key={`to-${t.id}`} value={t.id}>
                  {t.symbol} ({t.chain})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group swap-span-2">
            <label className="form-label">Amount In</label>
            <input
              className="input"
              placeholder="e.g. 0.005"
              inputMode="decimal"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
            />
            <div className="form-hint">This must be an amount your mobile wallet can actually send (ZEC).</div>
          </div>

          <div className="form-group swap-span-2">
            <label className="form-label">Destination Address (BTC, etc.)</label>
            <input
              className="input"
              placeholder="Recipient address on destination chain"
              autoComplete="off"
              spellCheck={false}
              value={destAddress}
              onChange={(e) => setDestAddress(e.target.value)}
            />
          </div>

          <div className="form-group swap-span-2">
            <label className="form-label">Refund Address (ZEC)</label>
            <input
              className="input"
              placeholder="Refund address on origin chain"
              autoComplete="off"
              spellCheck={false}
              value={refundAddress}
              onChange={(e) => setRefundAddress(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Slippage (bps)</label>
            <input
              className="input"
              placeholder="50 = 0.5%"
              inputMode="numeric"
              value={slippageTolerance}
              onChange={(e) => setSlippageTolerance(e.target.value)}
            />
            <div className="form-hint">1% = 100 bps. Max 10000.</div>
          </div>
        </div>

        <div className="swap-actions">
          <button className="btn" onClick={onQuote} disabled={isQuoting || !fromToken || !toToken}>
            {isQuoting ? "Getting Quote…" : "Get Quote"}
          </button>
          <button className="btn secondary" onClick={onConfirm} disabled={isConfirming || !fromToken || !toToken}>
            {isConfirming ? "Confirming…" : "Confirm"}
          </button>
        </div>

        <div className="divider" />

        <section className="swap-output">
          <div className="pretty-hint">Scan the QR code with your wallet and send exactly the amount shown.</div>

          {/* Quote pretty card */}
          {quotePretty && (
            <div className="pretty-card" style={{ marginTop: 12 }}>
              <div className="pretty-title">Quote</div>
              <div className="pretty-grid">
                <div>
                  <strong>From:</strong> {quotePretty.from}
                </div>
                <div>
                  <strong>To:</strong> {quotePretty.to}
                </div>

                <div>
                  <strong>You send:</strong> {quotePretty.amountInFormatted || "—"} {quotePretty.fromSymbol || ""}
                </div>
                <div>
                  <strong>You receive (est.):</strong> {quotePretty.amountOutFormatted || "—"} {quotePretty.toSymbol || ""}
                </div>

                <div>
                  <strong>Value (USD):</strong> {fmtUsd(quotePretty.amountInUsd)}
                </div>
                <div>
                  <strong>Receive (USD est.):</strong> {fmtUsd(quotePretty.amountOutUsd)}
                </div>
              </div>

              <div className="pretty-hint" style={{ marginTop: 10, opacity: 0.8 }}>
                Press <strong>Confirm</strong> to show the QR code.
              </div>
            </div>
          )}

          {/* Payment panel */}
          {confirmData && (
            <div className="pay-panel" style={{ marginTop: 14 }}>
              {qrValue ? (
                <div className="qr-small" aria-label="Payment QR">
                  <QRCodeCanvas value={qrValue} size={220} level="M" />
                </div>
              ) : null}

              <div className="pay-amount mono">
                <span>{depositAmount || "—"}</span> ZEC
              </div>

              <div className="don-actions">
                <button
                  className="addr-pill"
                  type="button"
                  onClick={async () => {
                    if (!depositAddr) return;
                    await copyToClipboard(depositAddr);
                    setNotice({ type: "info", msg: "Copied" });
                    setTimeout(() => setNotice(null), 1200);
                  }}
                  title="Copy address"
                  aria-label="Copy address"
                >
                  <span className="mono addr-short">{shortAddr(depositAddr)}</span>
                  <span className="addr-copy" aria-hidden="true">
                    ⧉
                  </span>
                </button>
              </div>
            </div>
          )}

          {notice && (
            <div className={`alert ${notice.type}`} style={{ marginTop: 12 }}>
              {notice.msg}
            </div>
          )}

          <details style={{ marginTop: 12 }}>
            <summary>Show raw JSON</summary>
            <pre className="swap-pre mono" style={{ marginTop: 12 }}>
              {raw ? JSON.stringify(raw, null, 2) : ""}
            </pre>
          </details>

          <div className="swap-footnote">
            API key stays server-side via <code>ONECLICK_API_KEY</code>. Payments are sent from the user’s mobile wallet.
          </div>
        </section>
      </section>
    </div>
  );
}
