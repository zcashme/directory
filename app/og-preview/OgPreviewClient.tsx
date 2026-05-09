"use client";

import ProfileCard from "@/ui/profile/ProfileCard";
import type { Profile, ProfileLink } from "@/lib/profile/types";

const PREVIEW_WIDTH = 1200;
const PREVIEW_HEIGHT = 630;
const COMPOSER_MAX_WIDTH_PX = 512;
const PROFILE_CARD_DESKTOP_WIDTH_RATIO = 460 / COMPOSER_MAX_WIDTH_PX;
const REAL_PROFILE_CARD_WIDTH = Math.round(
  COMPOSER_MAX_WIDTH_PX * PROFILE_CARD_DESKTOP_WIDTH_RATIO
);
const REAL_CARD_AVATAR_CENTER_Y_WITHIN_COMPONENT = 71;
const TARGET_AVATAR_CENTER_RATIO = 0.235;
const CARD_TOP = Math.round(PREVIEW_HEIGHT * TARGET_AVATAR_CENTER_RATIO) - REAL_CARD_AVATAR_CENTER_Y_WITHIN_COMPONENT;
const LEFT_GROUP_OFFSET_Y = 72;
const PREVIEW_SIDE_MARGIN = 108;
const COPY_BLOCK_WIDTH = 380;
const CARD_RIGHT_INSET = 138;

const previewVariants = [
  {
    title: "Exact Canvas",
    note: "Real `ProfileCard` cropped inside a native 1200 x 630 preview canvas.",
    width: 1200,
  },
  {
    title: "Browser Width",
    note: "Same canvas, reduced only by the outer browser frame.",
    width: 960,
  },
  {
    title: "Slack / X Scale",
    note: "Readable preview at a smaller browser display width.",
    width: 720,
  },
  {
    title: "Tight Preview",
    note: "Stress test for smaller embedded preview containers.",
    width: 560,
  },
] as const;

const sampleLinks: ProfileLink[] = [
  {
    url: "https://x.com/anakamoto",
    label: "anakamoto",
    platform: "X",
    is_verified: true,
  },
  {
    url: "https://github.com/anakamoto",
    label: "anakamoto",
    platform: "GitHub",
    is_verified: true,
  },
  {
    url: "https://anakamoto.dev",
    label: "anakamoto.dev",
    platform: "Other",
    is_verified: true,
  },
];

const sampleProfile: Profile = {
  id: 2025,
  name: "anakamoto",
  display_name: "Ava Nakamoto",
  slug: "anakamoto",
  bio: "Builder. Writer. Privacy advocate.",
  address: "u1qk7m0p9z8y7x6w5v4u3t2s1r0q",
  address_verified: true,
  nearest_city_name: "NYC",
  profile_image_url: "/og-preview-avatar.svg",
  links: sampleLinks,
  verified_links_count: 3,
  total_links: 3,
  joined_at: "2025-08-01T00:00:00.000Z",
  created_at: "2025-08-01T00:00:00.000Z",
  last_verified_at: "2026-05-01T00:00:00.000Z",
  featured: false,
  is_ns: false,
  is_maxi: false,
  profile_theme_package: null,
  profile_card_theme: null,
  profile_page_bkgd: null,
  profile_card_border: null,
};

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
        gap: "16px",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
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
          color: "#111827",
          fontSize: "26px",
          lineHeight: 1.18,
          fontWeight: 400,
          letterSpacing: "0",
          whiteSpace: "nowrap",
        }}
      >
        <span>{label}</span>
      </div>
    </div>
  );
}

function PreviewFrame({ width }: { width: number }) {
  const scale = width / PREVIEW_WIDTH;

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: `${width}px`,
          height: `${Math.round(PREVIEW_HEIGHT * scale)}px`,
          position: "relative",
          overflow: "hidden",
          borderRadius: "18px",
          border: "1px solid rgba(17, 24, 39, 0.14)",
          boxShadow: "0 24px 80px rgba(17, 24, 39, 0.14)",
          background: "var(--color-background)",
        }}
      >
        <div
          style={{
            width: `${PREVIEW_WIDTH}px`,
            height: `${PREVIEW_HEIGHT}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            background: "var(--color-background)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: `${PREVIEW_SIDE_MARGIN}px`,
              top: `${CARD_TOP + LEFT_GROUP_OFFSET_Y}px`,
              width: `${COPY_BLOCK_WIDTH}px`,
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              color: "#111827",
            }}
          >
            <div
              style={{
                fontSize: "70px",
                lineHeight: 0.94,
                letterSpacing: "-0.065em",
                fontWeight: 900,
                color: "#1d4ed8",
              }}
            >
              Zcash.me/
            </div>

            <div
              style={{
                fontSize: "26px",
                lineHeight: 1.18,
                color: "#374151",
                fontWeight: 500,
                maxWidth: "380px",
              }}
            >
              A trusted directory of real people and businesses that accept ZEC.
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "16px",
                marginTop: "4px",
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
              left: "auto",
              right: `${CARD_RIGHT_INSET}px`,
              top: `${CARD_TOP}px`,
              transform: "none",
              width: `${REAL_PROFILE_CARD_WIDTH}px`,
              minWidth: `${REAL_PROFILE_CARD_WIDTH}px`,
              maxWidth: `${REAL_PROFILE_CARD_WIDTH}px`,
              flex: "0 0 auto",
            }}
          >
            <ProfileCard
              profile={sampleProfile}
              tokens={[]}
              fullView
              duplicateNameCount={1}
              onShowQR={() => {}}
              onEditorModeChange={() => {}}
              onGenerateVerificationQr={() => {}}
              onDesignPanelBackgroundChange={() => {}}
              isVerificationGenerating={false}
              cardWidthPx={REAL_PROFILE_CARD_WIDTH}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OgPreviewClient() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(29, 78, 216, 0.08), transparent 28%), var(--color-background)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "32px",
      }}
    >
      <div
        style={{
          width: "min(100%, 1320px)",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "1200px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            color: "#4b5563",
            fontSize: "14px",
          }}
        >
          <span>Real `ProfileCard` cropped directly in the browser</span>
          <span>No separate mini-preview layout</span>
        </div>

        <div
          style={{
            width: "100%",
            maxWidth: "1200px",
            display: "grid",
            gap: "28px",
          }}
        >
          {previewVariants.map((variant) => (
            <section
              key={variant.title}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: "16px",
                  color: "#111827",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <strong style={{ fontSize: "16px" }}>{variant.title}</strong>
                  <span style={{ fontSize: "13px", color: "#6b7280" }}>{variant.note}</span>
                </div>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>
                  shown at {variant.width}px width
                </span>
              </div>

              <PreviewFrame width={variant.width} />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
