"use client";

import { useEffect, useState, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ServiceStatus = { status: "ok" | "down"; latency_ms: number };
type HealthData = {
  status: "ok" | "degraded";
  services: Record<string, ServiceStatus>;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const OPENSTATUS_SLUG = "zcashme";

const SERVICE_LABELS: Record<string, string> = {
  zcashme: "ZcashMe",
  directory: "Profile Directory",
  verifications: "Verifications",
};

const STATUS_COLORS = {
  ok: "#16a34a",
  down: "#dc2626",
} as const;

const POLL_INTERVAL = 600_000; // 10 min — matches API cache

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type BannerLevel = "ok" | "degraded" | "down" | "loading";

function formatLatency(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatusDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  );
}

function StatusBanner({ level }: { level: BannerLevel }) {
  const config = {
    loading: {
      bg: "rgba(156,163,175,0.08)",
      border: "#9ca3af",
      icon: "…",
      message: "Checking systems…",
    },
    ok: {
      bg: "rgba(22,163,74,0.08)",
      border: "#16a34a",
      icon: "✓",
      message: "All systems operational",
    },
    degraded: {
      bg: "rgba(234,179,8,0.08)",
      border: "#eab308",
      icon: "!",
      message: "Partial system outage",
    },
    down: {
      bg: "rgba(220,38,38,0.08)",
      border: "#dc2626",
      icon: "✕",
      message: "Unable to reach status API",
    },
  }[level];

  return (
    <div
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: config.border,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: 14,
          flexShrink: 0,
        }}
      >
        {config.icon}
      </span>
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>
          {config.message}
        </span>
      </div>
    </div>
  );
}

function ServiceCard({
  name,
  service,
}: {
  name: string;
  service: ServiceStatus | undefined;
}) {
  const status = service?.status;
  const color = status ? STATUS_COLORS[status] : "#9ca3af";
  const label = status === "ok" ? "Operational" : status === "down" ? "Down" : "—";

  return (
    <div
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-border-light)",
        borderRadius: 12,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <StatusDot color={color} />
      <span
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontWeight: 600,
          fontSize: 15,
          color: "var(--color-text-primary)",
          flex: 1,
        }}
      >
        {SERVICE_LABELS[name] ?? name}
      </span>
      {service && (
        <span
          style={{
            fontSize: 13,
            color: "var(--color-text-muted)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        >
          {formatLatency(service.latency_ms)}
        </span>
      )}
      <span style={{ fontSize: 13, color, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function StatusPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      // 503 carries a valid body (degraded) — render it instead of ignoring it
      if (res.ok || res.status === 503) {
        const data: HealthData = await res.json();
        setHealth(data);
        setLastChecked(new Date());
        setFetchError(false);
      }
    } catch {
      setFetchError(true);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const services = health ? Object.values(health.services) : [];
  const level: BannerLevel = fetchError
    ? "down"
    : !health
      ? "loading"
      : services.some((s) => s.status === "down")
        ? "degraded"
        : "ok";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-background)",
        padding: "48px 16px 80px",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
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
            Zcash.me Status
          </h1>
          {lastChecked && (
            <p
              style={{
                fontSize: 13,
                color: "var(--color-text-muted)",
                margin: 0,
              }}
            >
              Last checked {relativeTime(lastChecked.toISOString())} · refreshes
              every 10m
            </p>
          )}
        </div>

        {/* Banner — derived from /api/health */}
        <div style={{ marginBottom: 24 }}>
          <StatusBanner level={level} />
        </div>

        {/* Service cards — powered by internal health check */}
        <div>
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
            Services
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {["zcashme", "directory", "verifications"].map((name) => (
              <ServiceCard
                key={name}
                name={name}
                service={health?.services[name]}
              />
            ))}
          </div>
        </div>

        {/* External monitoring survives our own outage */}
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <a
            href={`https://${OPENSTATUS_SLUG}.openstatus.dev`}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 12,
              color: "var(--color-text-muted)",
              textDecoration: "none",
            }}
          >
            External monitoring: OpenStatus ↗
          </a>
        </div>
      </div>
    </div>
  );
}
