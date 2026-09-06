import { readFile } from "node:fs/promises";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PREVIEW_WIDTH = 1200;
const PREVIEW_HEIGHT = 630;
const COMPOSER_MAX_WIDTH_PX = 512;
const PROFILE_CARD_DESKTOP_WIDTH_RATIO = 430 / COMPOSER_MAX_WIDTH_PX;
const CARD_WIDTH = Math.round(COMPOSER_MAX_WIDTH_PX * PROFILE_CARD_DESKTOP_WIDTH_RATIO);
const PREVIEW_SIDE_MARGIN = 108;
const COPY_BLOCK_WIDTH = 380;
const CARD_RIGHT_INSET = 138;
const ACTION_INSET = 28;
const CARD_TOP_EXTENSION = 17;
const CARD_BASE_HEIGHT = 458;
const CARD_HEIGHT = CARD_BASE_HEIGHT + CARD_TOP_EXTENSION;

const AVATAR_REFERENCE_TOP = 22;
const ACTION_BUTTONS_TOP = AVATAR_REFERENCE_TOP + CARD_TOP_EXTENSION;
const ACTION_BUTTONS_HEIGHT = 36;
const AVATAR_SIZE = 120;
const AVATAR_OUTER_SIZE = AVATAR_SIZE + 6;
const AVATAR_OVERLAP_Y = Math.round(AVATAR_SIZE / 2 - (AVATAR_REFERENCE_TOP + ACTION_BUTTONS_HEIGHT));
const AVATAR_SHIFT_DOWN = 18;
const AVATAR_TRANSFORM_Y = Math.round(AVATAR_OUTER_SIZE / 2 + AVATAR_OVERLAP_Y);
const AVATAR_BORDER_MASK_WIDTH = AVATAR_OUTER_SIZE + 76;
const CARD_TOP_MARGIN = 64;
const CARD_OFFSET_Y = 7;
const CARD_COMPONENT_TOP_PADDING = CARD_TOP_MARGIN + CARD_OFFSET_Y + AVATAR_OVERLAP_Y;
const CONTENT_SHIFT_DOWN = 8;
const PREVIEW_BACKGROUND = "#faf6ed";

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const OG_FONT_FAMILY = "SegoeUIOG";
const CARD_BORDER_COLOR = "#111827";
const CARD_SURFACE = "rgba(255, 255, 255, 0.10)";
const TRAY_BORDER_COLOR = "#d1d5db";
const SUCCESS_BORDER_COLOR = "#86efac";
const LOWER_SECTION_GAP = 20;
const CARD_STROKE_WIDTH = 2.8;
const AVATAR_STROKE_WIDTH = 2.8;
const TRAY_FRAME_HEIGHT = 120;

const SAMPLE = {
  displayName: "Ava Nakamoto",
  handle: "/anakamoto",
  bio: "Builder. Writer. Privacy advocate.",
  meta: "Near NYC \u2022 Joined Jul 2025 \u2022 Active <2 weeks ago",
  address: "u1qk7m0p9z8y7x6w5v4u3t2s1r0q",
} as const;

const seguiRegular = readFile(path.join(process.cwd(), "public", "og-segoeui.ttf"));
const seguiBold = readFile(path.join(process.cwd(), "public", "og-segoeuib.ttf"));
const seguiBlack = readFile(path.join(process.cwd(), "public", "og-seguibl.ttf"));

function svgUri(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const AVATAR_ART_SRC = svgUri(`<svg width="${AVATAR_OUTER_SIZE}" height="${AVATAR_OUTER_SIZE}" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="240" height="240" rx="120" fill="#0F4AA5"/><path d="M0 180C44 154 72 144 116 146C154 148 184 160 240 194V240H0V180Z" fill="#BFD5E7"/><path d="M84 78C95 56 121 45 150 49C169 52 184 61 194 74L187 81L166 86L152 82L141 69L126 62L110 64L95 74L84 78Z" fill="#111827"/><path d="M82 86C92 67 111 55 133 54C153 53 172 61 188 74V111L174 110L152 123L131 149L118 171L103 176L92 168L90 138L82 118V86Z" fill="#1F2937"/><path d="M108 70C127 52 157 50 178 67L184 78L183 94L164 101L137 94L111 85L101 79L108 70Z" fill="#F0B90B"/><path d="M92 92C106 101 119 105 134 110C153 117 166 127 178 146L173 172L161 189L131 189L113 176L101 154L95 125L92 92Z" fill="#171717"/><path d="M179 105C194 110 206 120 214 137C218 145 220 154 221 168L208 181L194 173L183 161L176 147L171 133L171 116L179 105Z" fill="#E9EEF4"/><path d="M193 107C203 114 211 124 216 136L213 146L202 145L191 138L182 126L179 113L193 107Z" fill="#111827"/><path d="M146 52C168 52 186 64 192 77L163 81L129 70L109 59C118 54 131 52 146 52Z" fill="#D39A00"/></svg>`);
const SHIELD_ICON_SRC = svgUri(`<svg width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L19 6V11C19 15.4 16 19.4 12 21C8 19.4 5 15.4 5 11V6L12 3Z" stroke="#2563eb" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 12.3L11.1 14.4L15.3 10.2" stroke="#2563eb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
const COIN_ICON_SRC = svgUri(`<svg width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#2563eb" stroke-width="1.8"/><path d="M8.6 12.1L10.8 14.3L15.4 9.7" stroke="#2563eb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
const ZEC_ICON_SRC = svgUri(`<svg width="42" height="42" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#2563eb" stroke-width="1.8"/><path d="M8.5 8.4H15.5V10H10.6L15.5 13.6V15.3H8.5V13.7H13.4L8.5 10.1V8.4Z" fill="#2563eb"/><path d="M11.3 6.6H12.7V8.6H11.3V6.6Z" fill="#2563eb"/><path d="M11.3 15.4H12.7V17.4H11.3V15.4Z" fill="#2563eb"/></svg>`);
const VERIFIED_ICON_SRC = svgUri(`<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="9.8" fill="#dcfce7" stroke="#86efac" stroke-width="1.4"/><path d="M7.4 11.3L9.6 13.5L14.5 8.4" stroke="#16a34a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
const CTRL_MENU_SRC = svgUri(`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4.25H12" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/><path d="M4 8H12" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/><path d="M4 11.75H12" stroke="#64748b" stroke-width="1.5" stroke-linecap="round"/></svg>`);
const CTRL_SHARE_SRC = svgUri(`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 10.75V3.5" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round"/><path d="M5.5 6L8 3.5L10.5 6" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.75 9.25V11.25C4.75 11.6642 5.08579 12 5.5 12H10.5C10.9142 12 11.25 11.6642 11.25 11.25V9.25" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round"/></svg>`);
const GITHUB_ICON_SRC = svgUri(`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1.7C4.52 1.7 1.7 4.52 1.7 8C1.7 10.78 3.5 13.13 6 13.96C6.31 14.02 6.43 13.83 6.43 13.67V12.67C4.67 13.05 4.3 11.92 4.3 11.92C4.01 11.18 3.59 10.99 3.59 10.99C3 10.6 3.63 10.61 3.63 10.61C4.28 10.66 4.62 11.28 4.62 11.28C5.2 12.26 6.15 11.98 6.52 11.81C6.58 11.39 6.75 11.11 6.94 10.95C5.54 10.79 4.08 10.25 4.08 7.86C4.08 7.18 4.32 6.63 4.73 6.21C4.67 6.05 4.46 5.41 4.79 4.55C4.79 4.55 5.33 4.38 6.42 5.12C6.93 4.98 7.48 4.91 8.03 4.91C8.58 4.91 9.13 4.98 9.64 5.12C10.73 4.38 11.27 4.55 11.27 4.55C11.6 5.41 11.39 6.05 11.33 6.21C11.74 6.63 11.98 7.18 11.98 7.86C11.98 10.25 10.51 10.78 9.11 10.95C9.36 11.16 9.58 11.58 9.58 12.23V13.67C9.58 13.84 9.7 14.02 10.02 13.96C12.51 13.12 14.3 10.78 14.3 8C14.3 4.52 11.48 1.7 8 1.7Z" fill="#4b5563"/></svg>`);
const SITE_ICON_SRC = svgUri(`<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6.2" stroke="#9ca3af" stroke-width="1.2"/><path d="M2.8 8H13.2" stroke="#9ca3af" stroke-width="1.2" stroke-linecap="round"/><path d="M8 1.9C9.85 3.52 10.9 5.68 10.9 8C10.9 10.32 9.85 12.48 8 14.1C6.15 12.48 5.1 10.32 5.1 8C5.1 5.68 6.15 3.52 8 1.9Z" stroke="#9ca3af" stroke-width="1.2"/></svg>`);


function FeatureItem({
  kind,
  label,
}: {
  kind: "shield" | "coin" | "lock";
  label: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <img
        src={kind === "shield" ? SHIELD_ICON_SRC : kind === "coin" ? COIN_ICON_SRC : ZEC_ICON_SRC}
        width={42}
        height={42}
        style={{ flexShrink: 0 }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          color: "#111827",
          fontSize: 26,
          lineHeight: 1.18,
          fontWeight: 400,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function ControlButton({ kind }: { kind: "menu" | "share" }) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        border: "1px solid #cbd5e1",
        background: "rgba(255,255,255,0.88)",
        boxShadow: "0 1px 2px rgba(15,23,42,0.08)",
      }}
    >
      <img src={kind === "menu" ? CTRL_MENU_SRC : CTRL_SHARE_SRC} width={16} height={16} />
    </div>
  );
}

function VerifiedIcon() {
  return <img src={VERIFIED_ICON_SRC} width={22} height={22} style={{ flexShrink: 0 }} />;
}

// Removed dead CopyIcon helper.
/*
  return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
        fontSize: 13,
        lineHeight: 1,
      }}
    >
      ⧉
    </div>
  );
}
void CopyIcon;
*/
//

function CopyGlyph({ size = 14 }: { size?: number }) {
  return (
    <img
      src={svgUri(`<svg width="${size}" height="${size}" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="3.5" width="7" height="8" rx="1.35" stroke="#94a3b8" stroke-width="1.35"/><path d="M3.75 10.4V5.8C3.75 4.97157 4.42157 4.3 5.25 4.3H9.65" stroke="#94a3b8" stroke-width="1.35" stroke-linecap="round"/></svg>`)}
      width={size}
      height={size}
      style={{ flexShrink: 0 }}
    />
  );
  /*
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
        fontFamily: FONT_STACK,
        fontSize: size,
        fontWeight: 500,
        lineHeight: 1,
      }}
    >
      ⧉
    </div>
  );
*/
}

// Removed dead QrIcon helper.
/*
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="4" height="4" rx="0.8" stroke="#6b7280" strokeWidth="1.2" />
      <rect x="10" y="2" width="4" height="4" rx="0.8" stroke="#6b7280" strokeWidth="1.2" />
      <rect x="2" y="10" width="4" height="4" rx="0.8" stroke="#6b7280" strokeWidth="1.2" />
      <path d="M10 10H12V12H10V10Z" fill="#6b7280" />
      <path d="M12 12H14V14H12V12Z" fill="#6b7280" />
      <path d="M10 13H11.6" stroke="#6b7280" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
void QrIcon;
*/
//

function PlatformIcon({ kind }: { kind: "x" | "github" | "site" }) {
  if (kind === "x") {
    return (
      <div
        style={{
          width: 16,
          height: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 3,
          background: "#111827",
          color: "#ffffff",
          fontSize: 10,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        X
      </div>
    );
  }

  if (kind === "github") {
    return <img src={GITHUB_ICON_SRC} width={16} height={16} style={{ flexShrink: 0 }} />;
  }

  return <img src={SITE_ICON_SRC} width={16} height={16} style={{ flexShrink: 0 }} />;
}

function LinkVerifiedIcon() {
  return <img src={VERIFIED_ICON_SRC} width={22} height={22} style={{ flexShrink: 0 }} />;
}

function TrayFrame() {
  return (
    <svg
      width={CARD_WIDTH - 56}
      height={TRAY_FRAME_HEIGHT}
      viewBox={`0 0 ${CARD_WIDTH - 56} ${TRAY_FRAME_HEIGHT}`}
      fill="none"
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
    >
      <rect
        x="0.5"
        y="0.5"
        width={CARD_WIDTH - 57}
        height={TRAY_FRAME_HEIGHT - 1}
        rx="16"
        ry="16"
        stroke={TRAY_BORDER_COLOR}
        strokeWidth="1.25"
      />
    </svg>
  );
}

function WarningFrame() {
  return (
    <svg
      width="252"
      height="40"
      viewBox="0 0 252 40"
      fill="none"
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
    >
      <rect
        x="0.5"
        y="0.5"
        width="251"
        height="39"
        rx="7"
        ry="7"
        stroke={SUCCESS_BORDER_COLOR}
        strokeWidth="1.2"
      />
    </svg>
  );
}

function CardFrame() {
  const radius = 26;
  const gapHalf = Math.round((AVATAR_BORDER_MASK_WIDTH + 6) / 2);
  const gapStart = Math.round(CARD_WIDTH / 2 - gapHalf);
  const gapEnd = Math.round(CARD_WIDTH / 2 + gapHalf);

  return (
    <svg
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
      fill="none"
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", flexShrink: 0 }}
    >
      <path
        d={[
          `M ${radius} 0.5 H ${gapStart}`,
          `M ${gapEnd} 0.5 H ${CARD_WIDTH - radius}`,
          `A ${radius - 0.5} ${radius - 0.5} 0 0 1 ${CARD_WIDTH - 0.5} ${radius}`,
          `V ${CARD_HEIGHT - radius}`,
          `A ${radius - 0.5} ${radius - 0.5} 0 0 1 ${CARD_WIDTH - radius} ${CARD_HEIGHT - 0.5}`,
          `H ${radius}`,
          `A ${radius - 0.5} ${radius - 0.5} 0 0 1 0.5 ${CARD_HEIGHT - radius}`,
          `V ${radius}`,
          `A ${radius - 0.5} ${radius - 0.5} 0 0 1 ${radius} 0.5`,
        ].join(" ")}
        stroke={CARD_BORDER_COLOR}
        strokeWidth={CARD_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkRow({
  kind,
  label,
  domain,
  isLast = false,
}: {
  kind: "x" | "github" | "site";
  label: string;
  domain: string;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        minWidth: 0,
        height: 34,
        borderBottom: isLast ? "0" : "1px solid rgba(226,232,240,0.95)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 2,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
          flexShrink: 0,
        }}
      >
        <PlatformIcon kind={kind} />
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#1f2937",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
        <LinkVerifiedIcon />
      </div>

      <div
        style={{
          position: "absolute",
          right: 2,
          top: "50%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            fontSize: 11.5,
            color: "#6b7280",
            textAlign: "right",
            whiteSpace: "nowrap",
          }}
        >
          {domain}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <CopyGlyph size={15} />
        </div>
      </div>
    </div>
  );
}

function AvaAvatarArt() {
  return (
    <img
      src={AVATAR_ART_SRC}
      width={AVATAR_OUTER_SIZE}
      height={AVATAR_OUTER_SIZE}
      style={{ display: "block" }}
    />
  );
}

function AddressPill() {
  return (
    <div
      style={{
        marginTop: LOWER_SECTION_GAP,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          border: "1px solid #cbd5e1",
          background: "rgba(255,255,255,0.86)",
          color: "#4b5563",
          fontSize: 12.5,
          fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace",
          borderRadius: 999,
          paddingLeft: 14,
          paddingRight: 14,
          paddingTop: 6,
          paddingBottom: 6,
          boxShadow: "inset 0 1px 2px rgba(15,23,42,0.10)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "6%",
            right: "6%",
            top: 0,
            height: 5,
            borderRadius: 999,
            background: "linear-gradient(to bottom, rgba(229,231,235,0.7), transparent)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center" }}>
          {SAMPLE.address.slice(0, 6)}...{SAMPLE.address.slice(-6)}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginLeft: 14,
            color: "#6b7280",
            fontFamily: FONT_STACK,
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>QR</div>
          <CopyGlyph size={15} />
        </div>
      </div>
    </div>
  );
}

function ProfileTrayArt() {
  return (
    <div
      style={{
        width: CARD_WIDTH - 56,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: LOWER_SECTION_GAP,
      }}
    >
      <div
        style={{
          width: CARD_WIDTH - 56,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          borderRadius: 16,
          background: "rgba(255,255,255,0.82)",
          boxShadow: "inset 0 1px 2px rgba(15,23,42,0.10)",
          paddingLeft: 14,
          paddingRight: 14,
          paddingTop: 8,
          paddingBottom: 10,
        }}
      >
        <TrayFrame />
        <LinkRow kind="x" label="anakamoto" domain="x.com" />
        <LinkRow kind="github" label="anakamoto" domain="github.com" />
        <LinkRow kind="site" label="anakamoto.dev" domain="anakamoto.dev" isLast />
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "#15803d",
          background: "#f0fdf4",
          borderRadius: 7,
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 10,
          paddingBottom: 10,
          fontSize: 11.5,
          fontWeight: 600,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75), 0 2px 4px rgba(0,0,0,0.12)",
          whiteSpace: "nowrap",
        }}
      >
        <WarningFrame />
        <div style={{ display: "flex", alignItems: "center" }}>This address was recently active.</div>
        <div style={{ display: "flex", alignItems: "center", fontWeight: 700 }}>More</div>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="#16a34a"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function OpenGraphCard() {
  return (
    <div
      style={{
        width: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        borderRadius: 26,
        boxSizing: "border-box",
        background: CARD_SURFACE,
        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        overflow: "visible",
        height: CARD_HEIGHT,
        marginTop: -CARD_TOP_EXTENSION,
        paddingBottom: 24,
      }}
    >
      <CardFrame />
      <div
        style={{
          position: "absolute",
          top: -4,
          left: "50%",
          transform: "translateX(-50%)",
          width: AVATAR_BORDER_MASK_WIDTH,
          height: 14,
          borderBottomLeftRadius: 999,
          borderBottomRightRadius: 999,
          background: PREVIEW_BACKGROUND,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: AVATAR_OUTER_SIZE + 22,
          height: AVATAR_OUTER_SIZE + 22,
          transform: `translate(-50%, -${AVATAR_TRANSFORM_Y - AVATAR_SHIFT_DOWN + 11}px)`,
          borderRadius: 999,
          background: PREVIEW_BACKGROUND,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: ACTION_INSET,
          right: ACTION_INSET,
          top: ACTION_BUTTONS_TOP,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <ControlButton kind="menu" />
        <ControlButton kind="share" />
      </div>

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: AVATAR_OUTER_SIZE,
          height: AVATAR_OUTER_SIZE,
          transform: `translate(-50%, -${AVATAR_TRANSFORM_Y - AVATAR_SHIFT_DOWN}px)`,
          borderRadius: 999,
          border: `${AVATAR_STROKE_WIDTH}px solid #111827`,
          background: "#0F4AA5",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        }}
      >
        <AvaAvatarArt />
      </div>

      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: 64 + CONTENT_SHIFT_DOWN + CARD_TOP_EXTENSION,
        }}
      >
        <div
          style={{
            marginTop: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              maxWidth: "92%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                color: "#111827",
                fontSize: 33,
                fontWeight: 950,
                lineHeight: 1.1,
                letterSpacing: "-0.042em",
                textAlign: "center",
              }}
            >
              {SAMPLE.displayName}
            </div>
            <VerifiedIcon />
          </div>

          <div
            style={{
              marginTop: 4,
              display: "flex",
              alignItems: "center",
              color: "rgba(75, 85, 99, 0.85)",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {SAMPLE.handle}
          </div>

          <div
            style={{
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              maxWidth: "90%",
              color: "#4b5563",
              fontSize: 13.5,
              fontWeight: 500,
              lineHeight: 1.35,
              textAlign: "center",
            }}
          >
            {SAMPLE.bio}
          </div>

          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              maxWidth: "88%",
              color: "#6b7280",
              fontSize: 11.5,
              fontWeight: 500,
              lineHeight: 1.35,
              textAlign: "center",
            }}
          >
            {SAMPLE.meta}
          </div>
        </div>

        <AddressPill />

        <div
          style={{
            marginTop: LOWER_SECTION_GAP,
            marginBottom: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <ProfileTrayArt />
        </div>
      </div>
    </div>
  );
}

export default async function OpenGraphImage() {
  const [fontRegular, fontBold, fontBlack] = await Promise.all([
    seguiRegular,
    seguiBold,
    seguiBlack,
  ]);

  // Render embedded SVG artwork with Resvg; the Node ImageResponse Sharp path
  // can omit nested SVG images. Keep the output independent of that backend.
  const svg = await satori(
    (
      <div
        style={{
          width: PREVIEW_WIDTH,
          height: PREVIEW_HEIGHT,
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#faf6ed",
          color: "#111827",
          fontFamily: OG_FONT_FAMILY,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: PREVIEW_SIDE_MARGIN,
            top: "50%",
            transform: "translateY(-50%)",
            width: COPY_BLOCK_WIDTH,
            display: "flex",
            flexDirection: "column",
            gap: 24,
            color: "#111827",
          }}
        >
          <div
          style={{
            display: "flex",
            alignItems: "center",
            fontFamily: OG_FONT_FAMILY,
            fontSize: 70,
            lineHeight: 0.94,
            letterSpacing: "-0.065em",
            fontWeight: 950,
            color: "#1d4ed8",
          }}
          >
            Zcash.me/
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 26,
              lineHeight: 1.18,
              color: "#374151",
              fontWeight: 500,
              maxWidth: 380,
            }}
          >
            A trusted directory of real people and businesses that accept ZEC.
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 16,
              marginTop: 4,
            }}
          >
            <FeatureItem kind="shield" label="Verified Addresses" />
            <FeatureItem kind="coin" label="Authentic Socials" />
            <FeatureItem kind="lock" label="Private Transactions" />
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: CARD_RIGHT_INSET,
            top: "50%",
            transform: "translateY(-50%)",
            width: CARD_WIDTH,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            overflow: "visible",
          }}
        >
          <div
            style={{
              width: "100%",
              paddingTop: CARD_COMPONENT_TOP_PADDING,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <OpenGraphCard />
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: OG_FONT_FAMILY,
          data: fontRegular,
          weight: 400,
          style: "normal",
        },
        {
          name: OG_FONT_FAMILY,
          data: fontBold,
          weight: 700,
          style: "normal",
        },
        {
          name: OG_FONT_FAMILY,
          data: fontBlack,
          weight: 900,
          style: "normal",
        },
      ],
    }
  );

  const png = new Resvg(svg).render().asPng();
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-cache, no-store",
    },
  });
}
