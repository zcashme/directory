import { normalizeSocialUsername } from "../utils/normalizeSocialLink";
import { buildSocialUrl } from "../utils/buildSocialUrl";
import { isValidUrl } from "../utils/validateUrl";

const PLATFORM_OPTIONS = [
  { key: "X", label: "X (Twitter)" },
  { key: "GitHub", label: "GitHub" },
  { key: "Instagram", label: "Instagram" },
  { key: "Reddit", label: "Reddit" },
  { key: "LinkedIn", label: "LinkedIn" },
  { key: "Discord", label: "Discord" },
  { key: "TikTok", label: "TikTok" },
  { key: "Mastodon", label: "Mastodon" },
  { key: "Bluesky", label: "Bluesky" },
  { key: "Snapchat", label: "Snapchat" },
  { key: "Other", label: "Other (custom URL)" },
];

function deriveState(value) {
  const platform = value.platform || "X";
  const username = value.username || "";
  const otherUrl = value.otherUrl || "";
  const isOther = platform === "Other";

  const preview = isOther
    ? otherUrl.trim()
    : buildSocialUrl(platform, username) || "";

  if (isOther) {
    if (!otherUrl) {
      return { preview, valid: true, reason: null };
    }
    const res = isValidUrl(otherUrl.trim());
    return { preview, valid: res.valid, reason: res.reason };
  }

  if (!username) {
    return { preview, valid: true, reason: null };
  }

  const res = isValidUrl(preview || "");
  return { preview, valid: res.valid, reason: res.reason };
}

export default function SocialLinkInput({
  value,
  onChange,
  allowRemove = false,
  onRemove,
  footer = null,
  containerClassName = "",
  selectClassName = "",
  inputClassName = "",
}) {
  const current = value || {
    platform: "X",
    username: "",
    otherUrl: "",
    valid: true,
    reason: null,
  };

  const emitChange = (patch) => {
    const next = { ...current, ...patch };
    const platform = next.platform || "X";

    if (platform !== "Other") {
      next.username = normalizeSocialUsername(next.username || "", platform);
    }

    const { valid, reason } = deriveState(next);
    next.valid = valid;
    next.reason = reason;

    if (onChange) onChange(next);
  };

  const { preview, valid, reason } = deriveState(current);
  const isOther = current.platform === "Other";

  return (
    <div
      className={
        containerClassName
          ? containerClassName
          : "mb-3 rounded-xl border border-black/20 p-3 bg-white/60"
      }
    >
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={current.platform}
          onChange={(e) => emitChange({ platform: e.target.value })}
          className={
            selectClassName
              ? selectClassName
              : "rounded-xl border border-black/30 px-3 py-2 text-sm bg-white"
          }
        >
          {PLATFORM_OPTIONS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>

        {isOther ? (
          <input
            type="text"
            value={current.otherUrl || ""}
            onChange={(e) => emitChange({ otherUrl: e.target.value })}
            placeholder="https://example.com/your-page"
            className={
              inputClassName
                ? inputClassName
                : `flex-1 rounded-xl border px-3 py-2 text-sm font-mono bg-transparent outline-none ${
                    valid
                      ? "border-black/30 focus:border-blue-600"
                      : "border-red-400 focus:border-red-500"
                  }`
            }
          />
        ) : (
          <div className="flex-1">
            <input
              type="text"
              value={current.username || ""}
              onChange={(e) => emitChange({ username: e.target.value })}
              placeholder="your_username"
              className={
                inputClassName
                  ? inputClassName
                  : `w-full rounded-xl border px-3 py-2 text-sm font-mono bg-transparent outline-none ${
                      valid
                        ? "border-black/30 focus:border-blue-600"
                        : "border-red-400 focus:border-red-500"
                    }`
              }
            />
          </div>
        )}

        {allowRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700 text-xs font-medium mt-2 flex items-center gap-1"
            title="Remove link"
          >
            Remove link
          </button>
        )}
      </div>

      {preview && (
        <div className="mt-2 text-xs text-gray-600">
          <span className="font-semibold">Preview:</span>{" "}
          <span className="font-mono break-all">{preview}</span>
        </div>
      )}

      {!valid && reason && (
        <p className="text-xs text-red-600 mt-1 ml-1">{reason}</p>
      )}

      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
}
