"use client";

import { Fragment, useMemo, useState } from "react";
import QrUriBlock from "@/ui/verification/QrUriBlock";
import sourceData from "./source.json";

interface SourceRow {
  username?: string | null;
  zcasher_id: number;
  x_handle?: string | null;
  display_name?: string | null;
  name?: string | null;
  address: string;
  address_verified?: boolean;
  status_computed?: string | null;
  is_verified?: boolean;
}

const DEFAULT_AMOUNT_ZEC = "0.001";
const DEFAULT_MEMO_TEMPLATE = "Hey {name}, thanks for the retweet! /Zechariah";
const DEFAULT_TWEET_TEMPLATE = "Hey @{x_handle}, thanks for the retweet! /Zechariah";

function toBase64Url(text: string): string {
  try {
    return btoa(unescape(encodeURIComponent(text)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return "";
  }
}

// Mirrors ui/messaging/MemoComposer.tsx:31
function buildZcashUri(address: string, amount: string = "0", memo: string = ""): string {
  if (!address) return "";
  const base = `zcash:${address}`;
  const params: string[] = [];
  if (amount && Number(amount) > 0) params.push(`amount=${amount}`);
  if (memo) params.push(`memo=${toBase64Url(memo)}`);
  return params.length ? `${base}?${params.join("&")}` : base;
}

function resolveName(row: SourceRow): string {
  const preferred = row.display_name ?? row.name ?? row.username ?? "";
  const clean = preferred.trim();
  return clean || `zcasher-${row.zcasher_id}`;
}

function buildMemoFromTemplate(template: string, name: string): string {
  const fallback = DEFAULT_MEMO_TEMPLATE;
  const base = template.trim() || fallback;
  return base.split("{name}").join(name);
}

function normalizeXHandle(handle: string | null | undefined): string {
  return (handle ?? "").trim().replace(/^@+/, "");
}

function buildTweetFromTemplate(template: string, name: string, xHandle: string): string {
  const fallback = DEFAULT_TWEET_TEMPLATE;
  const base = template.trim() || fallback;
  return base
    .split("{name}").join(name)
    .split("{x_handle}").join(xHandle || name);
}

export default function TempZip321Page() {
  const [amount, setAmount] = useState(DEFAULT_AMOUNT_ZEC);
  const [memoTemplate, setMemoTemplate] = useState(DEFAULT_MEMO_TEMPLATE);
  const [tweetTemplate, setTweetTemplate] = useState(DEFAULT_TWEET_TEMPLATE);
  const [memoOverrides, setMemoOverrides] = useState<Record<string, string>>({});
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const input = Array.isArray(sourceData) ? (sourceData as SourceRow[]) : [];

    return input.map((row, index) => {
      const rowId = `${row.zcasher_id}-${index}`;
      const name = resolveName(row);
      const xHandle = normalizeXHandle(row.x_handle);
      const memoFromTemplate = buildMemoFromTemplate(memoTemplate, name);
      const memoOverride = memoOverrides[rowId] ?? "";
      const hasMemoOverride = memoOverride.trim().length > 0;
      const memo = hasMemoOverride ? memoOverride : memoFromTemplate;
      const tweetText = buildTweetFromTemplate(tweetTemplate, name, xHandle);
      const uri = buildZcashUri(row.address, amount, memo);
      const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
      const profileUrl = xHandle ? `https://x.com/${xHandle}` : "";

      return {
        rowId,
        name,
        xHandle,
        amount,
        memo,
        memoFromTemplate,
        memoOverride,
        hasMemoOverride,
        uri,
        tweetText,
        tweetUrl,
        profileUrl,
      };
    });
  }, [amount, memoOverrides, memoTemplate, tweetTemplate]);

  const allHandles = useMemo(() => {
    const seen = new Set<string>();
    const handles: string[] = [];

    for (const row of rows) {
      if (!row.xHandle) continue;
      const key = row.xHandle.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      handles.push(row.xHandle);
    }

    return handles;
  }, [rows]);

  const allHandlesMentions = allHandles.map((handle) => `@${handle}`).join(" ");
  const allHandlesTweetText = allHandlesMentions
    ? `Hey ${allHandlesMentions}, thanks for the retweet! /Zechariah`
    : "No valid x_handle values were found in source data.";
  const allHandlesTweetUrl = allHandlesMentions
    ? `https://x.com/intent/tweet?text=${encodeURIComponent(allHandlesTweetText)}`
    : "";

  const handleMemoOverrideChange = (rowId: string, value: string) => {
    setMemoOverrides((current) => {
      const trimmed = value.trim();
      if (!trimmed) {
        if (!(rowId in current)) return current;
        const next = { ...current };
        delete next[rowId];
        return next;
      }
      return { ...current, [rowId]: value };
    });
  };

  const handleExportZip321Uris = () => {
    const lines = rows
      .map((row) => row.uri)
      .filter((uri) => uri.length > 0)
      .join("\n");
    if (!lines) return;

    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.href = url;
    link.download = `zip321-uris-${timestamp}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-8">
      <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">
        Temporary ZIP321 + QR Generator
      </h1>
      <p className="mt-2 text-sm text-gray-700">
        Source file: <code>app/temp-zip321/source.json</code>
      </p>

      <div className="mt-4 flex items-center gap-3">
        <label htmlFor="zip321-amount" className="text-sm font-semibold text-gray-800">
          Amount (ZEC)
        </label>
        <input
          id="zip321-amount"
          type="number"
          min="0"
          step="0.0001"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="w-40 rounded-md border border-gray-400 px-3 py-1.5 text-sm text-gray-900"
        />
      </div>

      <div className="mt-3 max-w-3xl">
        <label htmlFor="zip321-memo-template" className="text-sm font-semibold text-gray-800">
          Memo Template
        </label>
        <textarea
          id="zip321-memo-template"
          value={memoTemplate}
          onChange={(event) => setMemoTemplate(event.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-gray-400 px-3 py-2 text-sm text-gray-900"
        />
        <p className="mt-1 text-xs text-gray-600">
          Use <code>{"{name}"}</code> to insert each recipient name.
        </p>
      </div>

      <div className="mt-3 max-w-3xl">
        <label htmlFor="zip321-tweet-template" className="text-sm font-semibold text-gray-800">
          X Message Template
        </label>
        <textarea
          id="zip321-tweet-template"
          value={tweetTemplate}
          onChange={(event) => setTweetTemplate(event.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-gray-400 px-3 py-2 text-sm text-gray-900"
        />
        <p className="mt-1 text-xs text-gray-600">
          Tokens: <code>{"{name}"}</code>, <code>{"{x_handle}"}</code>.
        </p>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={handleExportZip321Uris}
          className="rounded border border-gray-500 px-3 py-2 text-xs font-semibold uppercase text-gray-800 hover:bg-gray-100"
        >
          Export ZIP321 URIs (.txt)
        </button>
      </div>

      <div className="mt-6 overflow-x-auto border border-gray-300 bg-white">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border-b border-gray-300 px-3 py-2 font-semibold text-gray-900">Name</th>
              <th className="border-b border-gray-300 px-3 py-2 font-semibold text-gray-900">X</th>
              <th className="border-b border-gray-300 px-3 py-2 font-semibold text-gray-900">Amount</th>
              <th className="border-b border-gray-300 px-3 py-2 font-semibold text-gray-900">Memo</th>
              <th className="border-b border-gray-300 px-3 py-2 font-semibold text-gray-900">Custom Memo</th>
              <th className="border-b border-gray-300 px-3 py-2 font-semibold text-gray-900">ZIP321 URI</th>
              <th className="border-b border-gray-300 px-3 py-2 font-semibold text-gray-900">QR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isOpen = openRowId === row.rowId;

              return (
                <Fragment key={row.rowId}>
                  <tr className="align-top">
                    <td className="border-b border-gray-200 px-3 py-2 font-semibold text-gray-900">{row.name}</td>
                    <td className="border-b border-gray-200 px-3 py-2 text-gray-800">
                      {row.xHandle ? (
                        <div className="flex flex-col gap-1">
                          <a
                            href={row.tweetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={row.tweetText}
                            className="rounded border border-gray-500 px-2 py-1 text-xs font-semibold uppercase text-gray-800 hover:bg-gray-100 w-fit"
                          >
                            Tweet @{row.xHandle}
                          </a>
                          <a
                            href={row.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-700 underline"
                          >
                            x.com/{row.xHandle}
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">No handle</span>
                      )}
                    </td>
                    <td className="border-b border-gray-200 px-3 py-2 text-gray-800">{row.amount}</td>
                    <td className="border-b border-gray-200 px-3 py-2 text-gray-700">
                      <div className="break-words">{row.memo}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-wide text-gray-500">
                        {row.hasMemoOverride ? "Custom" : "Template"}
                      </div>
                    </td>
                    <td className="border-b border-gray-200 px-3 py-2 text-gray-700">
                      <textarea
                        value={row.memoOverride}
                        onChange={(event) => handleMemoOverrideChange(row.rowId, event.target.value)}
                        rows={2}
                        placeholder="Leave empty to use memo template"
                        className="w-full min-w-[220px] rounded border border-gray-400 px-2 py-1 text-xs text-gray-900"
                      />
                      {!row.hasMemoOverride && (
                        <div className="mt-1 text-[11px] text-gray-500">
                          Using template: {row.memoFromTemplate}
                        </div>
                      )}
                    </td>
                    <td className="border-b border-gray-200 px-3 py-2 text-xs text-gray-600 break-all">{row.uri}</td>
                    <td className="border-b border-gray-200 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setOpenRowId((current) => (current === row.rowId ? null : row.rowId))}
                        className="rounded border border-gray-500 px-2 py-1 text-xs font-semibold uppercase text-gray-800 hover:bg-gray-100"
                      >
                        {isOpen ? "Hide QR" : "Show QR"}
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={7} className="border-b border-gray-300 bg-gray-50 px-4 py-4">
                        <div className="mx-auto max-w-[360px]">
                          <QrUriBlock
                            uri={row.uri}
                            memoText={row.memo}
                            profileName={row.name}
                            forceShowQR
                            defaultShowQR
                            defaultShowURI={false}
                            qrHintText="Scan or Tap QR"
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-600">
                  No rows found. Add your JSON array to <code>app/temp-zip321/source.json</code>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-md border border-gray-300 bg-gray-50 px-4 py-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900">
          Combined X Message ({allHandles.length} handles)
        </h2>
        <p className="mt-2 text-sm text-gray-800 break-words">{allHandlesTweetText}</p>
        {allHandlesTweetUrl && (
          <a
            href={allHandlesTweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded border border-gray-500 px-3 py-1.5 text-xs font-semibold uppercase text-gray-800 hover:bg-gray-100"
          >
            Open Combined Tweet
          </a>
        )}
      </div>
    </main>
  );
}
