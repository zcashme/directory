import { useState } from "react";
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
  { key: "Telegram", label: "Telegram" },
  { key: "Other", label: "Other (custom URL)" },
];

function deriveState(value) {
  const platform = value.platform || "X";
  const username = value.username || "";
  const otherUrl = value.otherUrl || "";
  const isOther = platform === "Other";
  const previewOverride = (value.previewUrl || "").trim();
  const isDiscord = platform === "Discord";
  const discordPreview =
    isDiscord && username && !previewOverride
      ? `https://discord.com/users/(userID for ${username})`
      : "";

  const preview = isOther
    ? otherUrl.trim()
    : previewOverride || discordPreview || buildSocialUrl(platform, username) || "";

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

  if (isDiscord && discordPreview && !previewOverride) {
    return { preview, valid: true, reason: null };
  }

  const res = isValidUrl(previewOverride || preview || "");
  return { preview, valid: res.valid, reason: res.reason };
}

function HelpIcon({ text }) {
  const [show, setShow] = useState(false);
  const isTouch = typeof window !== "undefined" && "ontouchstart" in window;

  return (
    <div
      className="relative inline-block ml-1"
      onMouseEnter={(e) => {
        e.stopPropagation();
        !isTouch && setShow(true);
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        !isTouch && setShow(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        isTouch && setShow((s) => !s);
      }}
    >
      <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold border border-gray-400 rounded-full text-gray-600 cursor-pointer hover:bg-gray-100 select-none">
        ?
      </span>
      {show && (
        <div className="absolute z-20 w-48 text-xs text-gray-700 bg-white border border-gray-300 rounded-lg shadow-md p-2 -right-1 top-5">
          {text}
        </div>
      )}
    </div>
  );
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
    if (platform !== "Other" && ("username" in patch || "platform" in patch)) {
      next.previewUrl = "";
    }

    const { valid, reason } = deriveState(next);
    next.valid = valid;
    next.reason = reason;

    if (onChange) onChange(next);
  };

  const { preview, valid, reason } = deriveState(current);
  const isOther = current.platform === "Other";
  const showDiscordHelp = current.platform === "Discord" && !isOther;
  const discordHelpText =
    "Your Discord username is used for authentication. After successful authentication, the link updates to your user ID.";

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
          <div className="flex-1 flex items-center gap-2">
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
            {showDiscordHelp && (
              <div className="ml-auto flex items-center">
                <HelpIcon text={discordHelpText} />
              </div>
            )}
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
