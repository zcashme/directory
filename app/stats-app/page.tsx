import { getStatsAction } from "@/lib/stats/getStatsAction";

export const revalidate = 0;

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-border-light)",
        borderRadius: 12,
        padding: "20px 24px",
      }}
    >
      <p
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--color-text-muted)",
          margin: "0 0 8px",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: "var(--color-text-primary)",
          margin: 0,
          lineHeight: 1.1,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            fontSize: 13,
            color: "var(--color-text-muted)",
            margin: "6px 0 0",
          }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2
      style={{
        fontSize: 14,
        fontWeight: 600,
        color: "var(--color-text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        margin: "0 0 12px",
      }}
    >
      {title}
    </h2>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div
      style={{
        height: 6,
        borderRadius: 3,
        background: "var(--color-border-light)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: 3,
          background: "var(--color-accent-green)",
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}

function PlatformRow({
  platform,
  count,
  max,
}: {
  platform: string;
  count: number;
  max: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            textTransform: "capitalize",
          }}
        >
          {platform}
        </span>
        <span
          style={{
            fontSize: 13,
            color: "var(--color-text-muted)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        >
          {count}
        </span>
      </div>
      <ProgressBar value={count} max={max} />
    </div>
  );
}

export default async function StatsPage() {
  const { ok, data, error } = await getStatsAction();

  if (!ok || !data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--color-background)",
          padding: "48px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "var(--color-text-muted)" }}>
          Failed to load stats{error ? `: ${error}` : ""}
        </p>
      </div>
    );
  }

  const topMax = data.topPlatforms[0]?.count ?? 1;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background)",
        padding: "48px 16px 80px",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--color-text-primary)",
              margin: "0 0 4px",
            }}
          >
            Platform Stats
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "var(--color-text-muted)",
              margin: 0,
            }}
          >
            Zcash.me growth and adoption metrics
          </p>
        </div>

        {/* Profiles Overview */}
        <div style={{ marginBottom: 32 }}>
          <SectionHeader title="Profiles" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            <StatCard
              label="Total Profiles"
              value={data.totalProfiles.toLocaleString()}
            />
            <StatCard
              label="Verified"
              value={data.verifiedProfiles.toLocaleString()}
              sub={`${data.verificationRate.toFixed(1)}% verification rate`}
            />
            <StatCard
              label="Unverified"
              value={data.unverifiedProfiles.toLocaleString()}
            />
          </div>
        </div>

        {/* Growth (30d) */}
        <div style={{ marginBottom: 32 }}>
          <SectionHeader title="Growth (Last 30 Days)" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            <StatCard
              label="New Signups"
              value={data.newProfilesLast30d.toLocaleString()}
            />
            <StatCard
              label="New Verifications"
              value={data.newVerifiedLast30d.toLocaleString()}
            />
          </div>
        </div>

        {/* Referral Program */}
        <div style={{ marginBottom: 32 }}>
          <SectionHeader title="Referral Program" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            <StatCard
              label="Active Referrers"
              value={data.totalReferrers.toLocaleString()}
            />
            <StatCard
              label="Referred Users"
              value={data.totalReferred.toLocaleString()}
              sub={`${data.referralVerificationRate.toFixed(1)}% verified`}
            />
          </div>
        </div>

        {/* Verification Funnel */}
        <div style={{ marginBottom: 32 }}>
          <SectionHeader title="Verification Funnel" />
          <div
            style={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border-light)",
              borderRadius: 12,
              padding: "20px 24px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--color-text-primary)",
                }}
              >
                Profiles Verified
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--color-accent-green)",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                {data.verificationRate.toFixed(1)}%
              </span>
            </div>
            <ProgressBar
              value={data.verifiedProfiles}
              max={data.totalProfiles}
            />
            <p
              style={{
                fontSize: 12,
                color: "var(--color-text-muted)",
                margin: "8px 0 0",
              }}
            >
              {data.verifiedProfiles.toLocaleString()} of{" "}
              {data.totalProfiles.toLocaleString()} profiles
            </p>
          </div>
        </div>

        {/* Links & Platforms */}
        <div style={{ marginBottom: 32 }}>
          <SectionHeader title="Social Links" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <StatCard
              label="Total Links"
              value={data.totalLinks.toLocaleString()}
            />
            <StatCard
              label="Verified Links"
              value={data.verifiedLinks.toLocaleString()}
              sub={`${data.linkVerificationRate.toFixed(1)}% verified`}
            />
          </div>

          {data.topPlatforms.length > 0 && (
            <div
              style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border-light)",
                borderRadius: 12,
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--color-text-muted)",
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Top Platforms
              </p>
              {data.topPlatforms.map((p) => (
                <PlatformRow
                  key={p.platform}
                  platform={p.platform}
                  count={p.count}
                  max={topMax}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer timestamp */}
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "var(--color-text-muted)",
          }}
        >
          Generated{" "}
          {new Date(data.generatedAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
