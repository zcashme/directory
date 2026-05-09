import { ImageResponse } from "next/og";

export const runtime = "nodejs";

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
const ACTION_INSET = 20;

const ACTION_BUTTONS_TOP = 16;
const ACTION_BUTTONS_HEIGHT = 36;
const AVATAR_SIZE = 120;
const AVATAR_OUTER_SIZE = AVATAR_SIZE + 6;
const AVATAR_OVERLAP_Y = Math.round(AVATAR_SIZE / 2 - (ACTION_BUTTONS_TOP + ACTION_BUTTONS_HEIGHT));
const AVATAR_TRANSFORM_Y = Math.round(AVATAR_OUTER_SIZE / 2 + AVATAR_OVERLAP_Y);
const AVATAR_BORDER_MASK_WIDTH = AVATAR_SIZE + 18;
const CARD_TOP_MARGIN = 64;
const CARD_OFFSET_Y = 7;
const CARD_COMPONENT_TOP_PADDING = CARD_TOP_MARGIN + CARD_OFFSET_Y + AVATAR_OVERLAP_Y;

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

const SAMPLE = {
  displayName: "Ava Nakamoto",
  handle: "/anakamoto",
  bio: "Builder. Writer. Privacy advocate.",
  meta: "Near NYC \u2022 Joined Aug 2025 \u2022 Active <2 weeks ago",
  address: "u1qk7m0p9z8y7x6w5v4u3t2s1r0q",
} as const;

const PROFILE_TRAY_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzNzQiIGhlaWdodD0iMTM4IiB2aWV3Qm94PSIwIDAgMzc0IDEzOCIgZmlsbD0ibm9uZSI+CiAgPHJlY3QgeD0iMSIgeT0iMSIgd2lkdGg9IjM3MiIgaGVpZ2h0PSI5MiIgcng9IjE2IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuOCkiIHN0cm9rZT0iI2QxZDVkYiIvPgogIDxwYXRoIGQ9Ik0xNyAzMUgzNTciIHN0cm9rZT0iI2YzZjRmNiIvPgogIDxwYXRoIGQ9Ik0xNyA2MUgzNTciIHN0cm9rZT0iI2YzZjRmNiIvPgogIDxyZWN0IHg9IjE2IiB5PSIxMiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iMyIgZmlsbD0iIzExMTgyNyIvPgogIDx0ZXh0IHg9IjI0IiB5PSIyMyIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIxMCIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iI2ZmZmZmZiIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIj5YPC90ZXh0PgogIDx0ZXh0IHg9IjQyIiB5PSIyNCIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9IjUwMCIgZmlsbD0iIzFmMjkzNyIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIj5hbmFrYW1vdG88L3RleHQ+CiAgPGNpcmNsZSBjeD0iMTIyIiBjeT0iMjAiIHI9IjkiIGZpbGw9IiNkY2ZjZTciIHN0cm9rZT0iIzg2ZWZhYyIvPgogIDxwYXRoIGQ9Ik0xMTguOCAyMC4xTDEyMSAyMi4zTDEyNC44IDE3LjkiIHN0cm9rZT0iIzE2YTM0YSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgogIDx0ZXh0IHg9IjMwNyIgeT0iMjQiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiM2YjcyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+eC5jb208L3RleHQ+CiAgPHJlY3QgeD0iMzQzLjUiIHk9IjE1IiB3aWR0aD0iNy41IiBoZWlnaHQ9IjkiIHJ4PSIxLjUiIHN0cm9rZT0iIzljYTNhZiIgc3Ryb2tlLXdpZHRoPSIxLjEiLz4KICA8cGF0aCBkPSJNMzQyIDIyVjE3LjI1QzM0MiAxNi40MiAzNDIuNjcgMTUuNzUgMzQzLjUgMTUuNzVIMzQ4LjI1IiBzdHJva2U9IiM5Y2EzYWYiIHN0cm9rZS13aWR0aD0iMS4xIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8cGF0aCBkPSJNMjAgNDAuN0MxNi41MiA0MC43IDEzLjcgNDMuNTIgMTMuNyA0N0MxMy43IDQ5Ljc4IDE1LjUgNTIuMTMgMTggNTIuOTZDMTguMzEgNTMuMDIgMTguNDMgNTIuODMgMTguNDMgNTIuNjdWNTEuNjdDMTYuNjcgNTIuMDUgMTYuMyA1MC45MiAxNi4zIDUwLjkyQzE2LjAxIDUwLjE4IDE1LjU5IDQ5Ljk5IDE1LjU5IDQ5Ljk5QzE1IDQ5LjYgMTUuNjMgNDkuNjEgMTUuNjMgNDkuNjFDMTYuMjggNDkuNjYgMTYuNjIgNTAuMjggMTYuNjIgNTAuMjhDMTcuMiA1MS4yNiAxOC4xNSA1MC45OCAxOC41MiA1MC44MUMxOC41OCA1MC4zOSAxOC43NSA1MC4xMSAxOC45NCA0OS45NUMxNy41NCA0OS43OSAxNi4wOCA0OS4yNSAxNi4wOCA0Ni44NkMxNi4wOCA0Ni4xOCAxNi4zMiA0NS42MyAxNi43MyA0NS4yMUMxNi42NyA0NS4wNSAxNi40NiA0NC40MSAxNi43OSA0My41NUMxNi43OSA0My41NSAxNy4zMyA0My4zOCAxOC40MiA0NC4xMkMxOC45MyA0My45OCAxOS40OCA0My45MSAyMC4wMyA0My45MUMyMC41OCA0My45MSAyMS4xMyA0My45OCAyMS42NCA0NC4xMkMyMi43MyA0My4zOCAyMy4yNyA0My41NSAyMy4yNyA0My41NUMyMy42IDQ0LjQxIDIzLjM5IDQ1LjA1IDIzLjMzIDQ1LjIxQzIzLjc0IDQ1LjYzIDIzLjk4IDQ2LjE4IDIzLjk4IDQ2Ljg2QzIzLjk4IDQ5LjI1IDIyLjUxIDQ5Ljc4IDIxLjExIDQ5Ljk1QzIxLjM2IDUwLjE2IDIxLjU4IDUwLjU4IDIxLjU4IDUxLjIzVjUyLjY3QzIxLjU4IDUyLjg0IDIxLjcgNTMuMDIgMjIuMDIgNTIuOTZDMjQuNTEgNTIuMTIgMjYuMyA0OS43OCAyNi4zIDQ3QzI2LjMgNDMuNTIgMjMuNDggNDAuNyAyMCA0MC43WiIgZmlsbD0iIzRiNTU2MyIvPgogIDx0ZXh0IHg9IjQyIiB5PSI1MSIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9IjUwMCIgZmlsbD0iIzFmMjkzNyIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIj5hbmFrYW1vdG88L3RleHQ+CiAgPGNpcmNsZSBjeD0iMTIyIiBjeT0iNDciIHI9IjkiIGZpbGw9IiNkY2ZjZTciIHN0cm9rZT0iIzg2ZWZhYyIvPgogIDxwYXRoIGQ9Ik0xMTguOCA0Ny4xTDEyMSA0OS4zTDEyNC44IDQ0LjkiIHN0cm9rZT0iIzE2YTM0YSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgogIDx0ZXh0IHg9IjI3OCIgeT0iNTEiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiM2YjcyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+Z2l0aHViLmNvbTwvdGV4dD4KICA8cmVjdCB4PSIzNDMuNSIgeT0iNDIiIHdpZHRoPSI3LjUiIGhlaWdodD0iOSIgcng9IjEuNSIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjEuMSIvPgogIDxwYXRoIGQ9Ik0zNDIgNDlWNDQuMjVDMzQyIDQzLjQyIDM0Mi42NyA0Mi43NSAzNDMuNSA0Mi43NUgzNDguMjUiIHN0cm9rZT0iIzljYTNhZiIgc3Ryb2tlLXdpZHRoPSIxLjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDxjaXJjbGUgY3g9IjIwIiBjeT0iNzQiIHI9IjYuMiIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjEuMiIvPgogIDxwYXRoIGQ9Ik0xNC44IDc0SDI1LjIiIHN0cm9rZT0iIzljYTNhZiIgc3Ryb2tlLXdpZHRoPSIxLjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDxwYXRoIGQ9Ik0yMCA2Ny45QzIxLjg1IDY5LjUyIDIyLjkgNzEuNjggMjIuOSA3NEMyMi45IDc2LjMyIDIxLjg1IDc4LjQ4IDIwIDgwLjFDMTguMTUgNzguNDggMTcuMSA3Ni4zMiAxNy4xIDc0QzE3LjEgNzEuNjggMTguMTUgNjkuNTIgMjAgNjcuOVoiIHN0cm9rZT0iIzljYTNhZiIgc3Ryb2tlLXdpZHRoPSIxLjIiLz4KICA8dGV4dCB4PSI0MiIgeT0iNzgiIGZvbnQtc2l6ZT0iMTEiIGZvbnQtd2VpZ2h0PSI1MDAiIGZpbGw9IiMxZjI5MzciIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiI+YW5ha2Ftb3RvLmRldjwvdGV4dD4KICA8Y2lyY2xlIGN4PSIxNDUiIGN5PSI3NCIgcj0iOSIgZmlsbD0iI2RjZmNlNyIgc3Ryb2tlPSIjODZlZmFjIi8+CiAgPHBhdGggZD0iTTE0MS44IDc0LjFMMTQ0IDc2LjNMMTQ3LjggNzEuOSIgc3Ryb2tlPSIjMTZhMzRhIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CiAgPHRleHQgeD0iMjU5IiB5PSI3OCIgZm9udC1zaXplPSIxMSIgZmlsbD0iIzZiNzI4MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIj5hbmFrYW1vdG8uZGV2PC90ZXh0PgogIDxyZWN0IHg9IjM0My41IiB5PSI2OSIgd2lkdGg9IjcuNSIgaGVpZ2h0PSI5IiByeD0iMS41IiBzdHJva2U9IiM5Y2EzYWYiIHN0cm9rZS13aWR0aD0iMS4xIi8+CiAgPHBhdGggZD0iTTM0MiA3NlY3MS4yNUMzNDIgNzAuNDIgMzQyLjY3IDY5Ljc1IDM0My41IDY5Ljc1SDM0OC4yNSIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjEuMSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgPHJlY3QgeD0iOTYiIHk9IjExMSIgd2lkdGg9IjE4MiIgaGVpZ2h0PSIyNyIgcng9IjYiIGZpbGw9IiNmMGZkZjQiIHN0cm9rZT0iI2JiZjdkMCIvPgogIDx0ZXh0IHg9IjEwOCIgeT0iMTI4IiBmb250LXNpemU9IjExIiBmb250LXdlaWdodD0iNjAwIiBmaWxsPSIjMTU4MDNkIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiPlRoaXMgYWRkcmVzcyB3YXMgcmVjZW50bHkgYWN0aXZlLjwvdGV4dD4KICA8dGV4dCB4PSIyODYiIHk9IjEyOCIgZm9udC1zaXplPSIxMSIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iIzE1ODAzZCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIj5Nb3JlPC90ZXh0PgogIDxwYXRoIGQ9Ik0zMjEgMTIwLjVMMzI0LjUgMTI0TDMyMSAxMjcuNSIgc3Ryb2tlPSIjMTZhMzRhIiBzdHJva2Utd2lkdGg9IjEuNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPg==";

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
      <div
        style={{
          width: 48,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#2563eb",
          flexShrink: 0,
        }}
      >
        {kind === "shield" ? (
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
            <path d="M12 3L19 6V11C19 15.4 16 19.4 12 21C8 19.4 5 15.4 5 11V6L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M9 12.3L11.1 14.4L15.3 10.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : kind === "coin" ? (
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8.6 12.1L10.8 14.3L15.4 9.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" style={{ transform: "scaleX(-1)" }}>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8.5 8.4H15.5V10H10.6L15.5 13.6V15.3H8.5V13.7H13.4L8.5 10.1V8.4Z" fill="currentColor" />
            <path d="M11.3 6.6H12.7V8.6H11.3V6.6Z" fill="currentColor" />
            <path d="M11.3 15.4H12.7V17.4H11.3V15.4Z" fill="currentColor" />
          </svg>
        )}
      </div>

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
        border: "1px solid #d1d5db",
        background: "rgba(255,255,255,0.8)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        color: "#6b7280",
      }}
    >
      {kind === "menu" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4.25H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4 8H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4 11.75H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 10.75V3.5" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M5.5 6L8 3.5L10.5 6" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4.75 9.25V11.25C4.75 11.6642 5.08579 12 5.5 12H10.5C10.9142 12 11.25 11.6642 11.25 11.25V9.25" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
}

function VerifiedIcon() {
  return (
    <div
      style={{
        width: 18,
        height: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        background: "#dcfce7",
        border: "1px solid #86efac",
        flexShrink: 0,
      }}
    >
      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
        <path d="M2 5.1L4.1 7.2L8 2.9" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <rect x="5" y="3.5" width="7.5" height="9" rx="1.5" stroke="#9ca3af" strokeWidth="1.2" />
      <path d="M3.5 10.5V5.75C3.5 4.92157 4.17157 4.25 5 4.25H9.75" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function QrIcon() {
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

function AvaAvatarArt() {
  return (
    <svg width={AVATAR_SIZE} height={AVATAR_SIZE} viewBox="0 0 240 240" fill="none">
      <rect width="240" height="240" rx="120" fill="#0F4AA5" />
      <path d="M0 180C44 154 72 144 116 146C154 148 184 160 240 194V240H0V180Z" fill="#BFD5E7" />
      <path d="M84 78C95 56 121 45 150 49C169 52 184 61 194 74L187 81L166 86L152 82L141 69L126 62L110 64L95 74L84 78Z" fill="#111827" />
      <path d="M82 86C92 67 111 55 133 54C153 53 172 61 188 74V111L174 110L152 123L131 149L118 171L103 176L92 168L90 138L82 118V86Z" fill="#1F2937" />
      <path d="M108 70C127 52 157 50 178 67L184 78L183 94L164 101L137 94L111 85L101 79L108 70Z" fill="#F0B90B" />
      <path d="M92 92C106 101 119 105 134 110C153 117 166 127 178 146L173 172L161 189L131 189L113 176L101 154L95 125L92 92Z" fill="#171717" />
      <path d="M179 105C194 110 206 120 214 137C218 145 220 154 221 168L208 181L194 173L183 161L176 147L171 133L171 116L179 105Z" fill="#E9EEF4" />
      <path d="M193 107C203 114 211 124 216 136L213 146L202 145L191 138L182 126L179 113L193 107Z" fill="#111827" />
      <path d="M146 52C168 52 186 64 192 77L163 81L129 70L109 59C118 54 131 52 146 52Z" fill="#D39A00" />
    </svg>
  );
}

function AddressPill() {
  return (
    <div
      style={{
        marginTop: 8,
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
          gap: 8,
          border: "1px solid #d1d5db",
          background: "rgba(255,255,255,0.8)",
          color: "#4b5563",
          fontSize: 12,
          fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace",
          borderRadius: 999,
          paddingLeft: 11,
          paddingRight: 11,
          paddingTop: 6,
          paddingBottom: 6,
          boxShadow: "inset 0 1px 2px rgba(15,23,42,0.08)",
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
            gap: 6,
            color: "#6b7280",
            fontFamily: FONT_STACK,
            fontSize: 10,
          }}
        >
          <QrIcon />
          <CopyIcon />
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
        height: 138,
        position: "relative",
        display: "flex",
      }}
    >
      <img src={PROFILE_TRAY_DATA_URL} width={CARD_WIDTH - 56} height={138} alt="" />
      <div style={{ position: "absolute", left: 36, top: 15, fontSize: 11, fontWeight: 500, color: "#1f2937" }}>
        anakamoto
      </div>
      <div style={{ position: "absolute", right: 46, top: 15, fontSize: 11, color: "#6b7280" }}>
        x.com
      </div>
      <div style={{ position: "absolute", left: 36, top: 42, fontSize: 11, fontWeight: 500, color: "#1f2937" }}>
        anakamoto
      </div>
      <div style={{ position: "absolute", right: 74, top: 42, fontSize: 11, color: "#6b7280" }}>
        github.com
      </div>
      <div style={{ position: "absolute", left: 36, top: 69, fontSize: 11, fontWeight: 500, color: "#1f2937" }}>
        anakamoto.dev
      </div>
      <div style={{ position: "absolute", right: 55, top: 69, fontSize: 11, color: "#6b7280" }}>
        anakamoto.dev
      </div>
      <div style={{ position: "absolute", left: 108, top: 111, fontSize: 11, fontWeight: 600, color: "#15803d" }}>
        This address was recently active.
      </div>
      <div style={{ position: "absolute", right: 53, top: 111, fontSize: 11, fontWeight: 700, color: "#15803d" }}>
        More
      </div>
    </div>
  );
}

export default function OpenGraphImage() {
  return new ImageResponse(
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
          fontFamily: FONT_STACK,
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
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                borderRadius: 26,
                border: "1px solid rgba(17,24,39,0.82)",
                background: "#fffefb",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                overflow: "visible",
                paddingBottom: 24,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -2,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: AVATAR_BORDER_MASK_WIDTH,
                  height: 6,
                  borderBottomLeftRadius: 999,
                  borderBottomRightRadius: 999,
                  background: "#fffefb",
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
                  transform: `translate(-50%, -${AVATAR_TRANSFORM_Y}px)`,
                  borderRadius: 999,
                  border: "1px solid #111827",
                  background: "#faf6ed",
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
                  paddingTop: 64,
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
                        fontSize: 27,
                        fontWeight: 900,
                        lineHeight: 1.15,
                        letterSpacing: "-0.03em",
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
                      fontSize: 14,
                      fontWeight: 500,
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
                      color: "rgba(55, 65, 81, 0.9)",
                      fontSize: 12,
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
                      color: "rgba(75, 85, 99, 0.85)",
                      fontSize: 10.5,
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
                    marginTop: 18,
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
          </div>
        </div>
      </div>
    ),
    size
  );
}
