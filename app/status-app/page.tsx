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

type OverallStatus =
  | "OPERATIONAL"
  | "DEGRADED"
  | "PARTIAL_OUTAGE"
  | "MAJOR_OUTAGE"
  | "MAINTENANCE"
  | "UNKNOWN";

type StatusReport = {
  id?: string;
  title?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

type OpenStatusData = {
  overallStatus: OverallStatus | null;
  statusReports: StatusReport[];
  maintenances: unknown[];
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
  degraded: "#eab308",
} as const;

const POLL_INTERVAL = 600_000; // 10 min — matches API cache

const OVERALL_STATUS_MAP: Record<OverallStatus, { level: "ok" | "degraded" | "down"; label: string; color: string }> = {
  OPERATIONAL: { level: "ok", label: "Operational", color: "#16a34a" },
  DEGRADED: { level: "degraded", label: "Degraded", color: "#eab308" },
  PARTIAL_OUTAGE: { level: "degraded", label: "Partial Outage", color: "#eab308" },
  MAJOR_OUTAGE: { level: "down", label: "Major Outage", color: "#dc2626" },
  MAINTENANCE: { level: "degraded", label: "Under Maintenance", color: "#6b7280" },
  UNKNOWN: { level: "degraded", label: "Unknown", color: "#9ca3af" },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function overallLevel(
  status: OverallStatus | null,
): "ok" | "degraded" | "down" | "loading" {
  if (!status) return "loading";
  return OVERALL_STATUS_MAP[status]?.level ?? "degraded";
}

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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

function StatusBanner({ status }: { status: OverallStatus | null }) {
  const level = overallLevel(status);
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
      message: "Major outage",
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
      {status && (
        <span
          style={{
            fontSize: 13,
            color: "var(--color-text-muted)",
            whiteSpace: "nowrap",
          }}
        >
          Checked {relativeTime(new Date().toISOString())}
        </span>
      )}
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

function StatusReportCard({ report }: { report: StatusReport }) {
  const statusColor =
    report.status === "resolved" ? "#16a34a" :
    report.status === "monitoring" ? "#1d4ed8" :
    report.status === "identified" ? "#eab308" :
    "#dc2626";

  return (
    <div
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-border-light)",
        borderRadius: 12,
        padding: "16px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <StatusDot color={statusColor} size={8} />
          <span
            style={{
              fontWeight: 600,
              fontSize: 15,
              color: "var(--color-text-primary)",
            }}
          >
            {report.title ?? "Incident"}
          </span>
        </div>
        {report.status && (
          <span
            style={{
              fontSize: 12,
              color: statusColor,
              fontWeight: 500,
              textTransform: "capitalize",
            }}
          >
            {report.status}
          </span>
        )}
      </div>
      {report.createdAt && (
        <p
          style={{
            fontSize: 13,
            color: "var(--color-text-muted)",
            margin: "8px 0 0",
          }}
        >
          {formatDate(report.createdAt)}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function StatusPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [openStatus, setOpenStatus] = useState<OpenStatusData | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data: HealthData = await res.json();
        setHealth(data);
        setLastChecked(new Date());
      }
    } catch {
      /* keep stale data */
    }
  }, []);

  const fetchOpenStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/openstatus");
      if (res.ok) {
        const data: OpenStatusData = await res.json();
        setOpenStatus(data);
      }
    } catch {
      /* keep stale data */
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    fetchOpenStatus();
    const interval = setInterval(() => {
      fetchHealth();
      fetchOpenStatus();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchHealth, fetchOpenStatus]);

  const overallStatus = openStatus?.overallStatus ?? null;
  const reports = openStatus?.statusReports ?? [];

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

        {/* Banner — powered by OpenStatus */}
        <div style={{ marginBottom: 24 }}>
          <StatusBanner status={overallStatus} />
        </div>

        {/* Service cards — powered by internal health check */}
        <div style={{ marginBottom: 32 }}>
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

        {/* Status reports — powered by OpenStatus */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              margin: "0 0 12px",
            }}
          >
            <h2
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: 0,
              }}
            >
              Recent Incidents
            </h2>
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
              OpenStatus ↗
            </a>
          </div>
          {reports.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                color: "var(--color-text-muted)",
                padding: "32px 0",
                fontSize: 14,
              }}
            >
              No recent incidents.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {reports.map((report, i) => (
                <StatusReportCard key={report.id ?? i} report={report} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
