import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CARD_WIDTH = 760;
const CARD_HEIGHT = 430;
const AVATAR_SIZE = 120;
const AVATAR_OUTER_SIZE = AVATAR_SIZE + 6;
const AVATAR_BORDER_MASK_WIDTH = AVATAR_SIZE + 18;
const AVATAR_SPACER = 64;
const ACTION_BUTTONS_TOP = 16;
const ACTION_BUTTONS_HEIGHT = 36;
const ACTION_INSET = 16;
const AVATAR_OVERLAP_Y = Math.round(AVATAR_SIZE / 2 - (ACTION_BUTTONS_TOP + ACTION_BUTTONS_HEIGHT));
const AVATAR_TRANSFORM_Y = Math.round(AVATAR_OUTER_SIZE / 2 + AVATAR_OVERLAP_Y);
const PREVIEW_HEIGHT = 630;
const AVATAR_OFFSET_FROM_CARD_TOP = -AVATAR_OVERLAP_Y;
const AVATAR_CENTER_Y = Math.round(PREVIEW_HEIGHT * 0.33);
const CARD_TOP = AVATAR_CENTER_Y - AVATAR_OFFSET_FROM_CARD_TOP;

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
      }}
    >
      {kind === "menu" ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4.25H12" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4 8H12" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4 11.75H12" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" />
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
        display: "flex",
        alignItems: "center",
        borderRadius: 999,
        width: 24,
        height: 24,
        justifyContent: "center",
        background: "#dcfce7",
        border: "1px solid #86efac",
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          background: "#86efac",
        }}
      >
        <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
          <path d="M2 5.1L4.1 7.2L8 2.9" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#faf6ed",
          color: "#111827",
          fontFamily:
            "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: CARD_TOP,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              borderRadius: 26,
              border: "1px solid rgba(17,24,39,0.7)",
              background: "#fffefb",
              boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              overflow: "visible",
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
                backgroundColor: "#fffefb",
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
              <div
                style={{
                  width: AVATAR_SIZE,
                  height: AVATAR_SIZE,
                  display: "flex",
                  borderRadius: 999,
                  background:
                    "linear-gradient(180deg, #f0b90b 0%, #d89a00 44%, #1f3b63 44%, #0f172a 100%)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 34,
                    top: 10,
                    width: 52,
                    height: 34,
                    borderRadius: "30px 30px 10px 10px",
                    background: "#eab308",
                    border: "1px solid rgba(0,0,0,0.12)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 30,
                    top: 38,
                    width: 54,
                    height: 62,
                    borderRadius: "26px 26px 12px 12px",
                    background: "#111827",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 24,
                    width: 26,
                    height: 52,
                    borderRadius: "20px 0 0 20px",
                    background:
                      "repeating-linear-gradient(180deg, #0f172a 0 5px, #f3f4f6 5px 10px)",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingLeft: 24,
                paddingRight: 24,
                paddingTop: AVATAR_SPACER + 12,
                paddingBottom: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 34,
                      fontWeight: 900,
                      letterSpacing: "-0.04em",
                      lineHeight: 1.1,
                    }}
                  >
                    Safety First!
                  </span>
                  <VerifiedIcon />
                </div>

                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    lineHeight: 1.2,
                    color: "#6b7280",
                  }}
                >
                  /SaveZcash
                </span>

                <span
                  style={{
                    marginTop: 6,
                    fontSize: 16,
                    lineHeight: 1.3,
                    color: "#4b5563",
                    textAlign: "center",
                  }}
                >
                  ZEC is a unit of account
                </span>

                <span
                  style={{
                    marginTop: 6,
                    maxWidth: 560,
                    fontSize: 14,
                    lineHeight: 1.35,
                    color: "#6b7280",
                    textAlign: "center",
                  }}
                >
                  Near Bangkok, Bangkok Metropolis, Thailand • Joined Sep 2025 •
                </span>
                <span
                  style={{
                    fontSize: 14,
                    lineHeight: 1.35,
                    color: "#6b7280",
                    textAlign: "center",
                  }}
                >
                  Active &lt;2 months ago
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
