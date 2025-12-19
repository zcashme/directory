import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export default function ZcashStats() {
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [growthDaily, setGrowthDaily] = useState([]);
  const [growthWeekly, setGrowthWeekly] = useState([]);
  const [growthMonthly, setGrowthMonthly] = useState([]);
  const [ranked, setRanked] = useState([]);

  // initial defaults: Weekly tab, percent mode
  const [activeTab, setActiveTab] = useState("weekly");
  const [chartMode, setChartMode] = useState("totals");
  const [chartScale, setChartScale] = useState("percent");

  const [summaryCols, setSummaryCols] = useState(3);
  const [leaderboardLimit, setLeaderboardLimit] = useState(10);

  const [showChart, setShowChart] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [showReferrers, setShowReferrers] = useState(false);

  // palette
  const COLOR_MEMBERS = "#2563eb";
const COLOR_OTHER = "#2563eb"; // match All/Members blue for softer contrast
  const COLOR_ONLY_REF = "#f97316";
  const COLOR_ONLY_VER = "#16a34a";
  // ----- Summary matrix + format helpers -----
  const summaryMatrix = useMemo(() => {
    const rows = [
      { key: "other", label: "Other", color: COLOR_OTHER },
      { key: "referred", label: "Referred", color: COLOR_ONLY_REF },
      { key: "verified", label: "Verified", color: COLOR_ONLY_VER },
      { key: "both", label: "Verified+Ref", color: "linear-gradient(90deg,#2563eb,#16a34a)" },
    ];

    const growthSrc =
      activeTab === "daily"
        ? growthDaily
        : activeTab === "monthly"
        ? growthMonthly
        : activeTab === "weekly"
        ? growthWeekly
        : growthWeekly; // fallback for all

    if (!growthSrc || growthSrc.length === 0) {
      return { rows, cols: [] };
    }

    // aggregate totals
    const totals = growthSrc.reduce(
      (acc, g) => {
        const m = Number(g.total_new_members || 0);
        const r = Number(g.referred_members || 0);
        const v = Number(g.verified_members || 0);
        const b = Number(g.verified_and_referred_members || 0);
        const onlyRef = Math.max(0, r - b);
        const onlyVer = Math.max(0, v - b);
        const both = Math.max(0, b);
        const other = Math.max(0, m - (onlyRef + onlyVer + both));
        acc.members += m;
        acc.other += other;
        acc.referred += onlyRef;
        acc.verified += onlyVer;
        acc.both += both;
        return acc;
      },
      { members: 0, other: 0, referred: 0, verified: 0, both: 0 }
    );

    const allCol = { header: "All", values: totals };

    const recent = [...growthSrc].slice(-(summaryCols - 1)).reverse();
    const recentCols = recent.map((r) => {
      const m = Number(r.total_new_members || 0);
      const rf = Number(r.referred_members || 0);
      const vf = Number(r.verified_members || 0);
      const bf = Number(r.verified_and_referred_members || 0);
      const onlyRef = Math.max(0, rf - bf);
      const onlyVer = Math.max(0, vf - bf);
      const both = Math.max(0, bf);
      const other = Math.max(0, m - (onlyRef + onlyVer + both));
      return {
        header:
          activeTab === "monthly"
            ? (r.month_start || "").slice(0, 7)
            : (r.day_start || r.week_start || "").slice(0, 10),
        values: { members: m, other, referred: onlyRef, verified: onlyVer, both },
      };
    });

    return { rows, cols: [allCol, ...recentCols] };
  }, [activeTab, growthDaily, growthWeekly, growthMonthly, summaryCols]);

// Format summary cell depending on chartMode (totals vs. change since last)
const formatCell = (rowKey, colValues, colIndex = 0, allCols = []) => {
  const total = colValues.members || 0;
  const val =
    rowKey === "other"
      ? colValues.other
      : rowKey === "referred"
      ? colValues.referred
      : rowKey === "verified"
      ? colValues.verified
      : colValues.both;
  const pct = total > 0 ? Math.round((val / total) * 100) : 0;

  // Default totals mode
  if (chartMode === "totals" || colIndex === allCols.length - 1) {
    return `${val} (${pct}%)`;
  }

  // In "change" mode → show Δ vs previous period
  const prevCol = allCols[colIndex + 1];
  if (!prevCol || !prevCol.values) return `${val} (${pct}%)`;

  const prevVals = prevCol.values;
  const prevTotal = prevVals.members || 0;
  const prevVal =
    rowKey === "other"
      ? prevVals.other
      : rowKey === "referred"
      ? prevVals.referred
      : rowKey === "verified"
      ? prevVals.verified
      : prevVals.both;

  const diffVal = val - prevVal;
  const diffPct =
    total > 0 && prevTotal > 0
      ? Math.round((val / total) * 100 - (prevVal / prevTotal) * 100)
      : 0;
  const sign = diffVal > 0 ? "+" : diffVal < 0 ? "−" : "";
  return `${sign}${Math.abs(diffVal)} (${sign}${Math.abs(diffPct)}%)`;
};


  useEffect(() => {
    async function loadBase() {
      setLoadingBase(true);
      const [{ data: d }, { data: w }, { data: m }] =
        await Promise.all([
          supabase
            .from("growth_over_time_daily")
            .select("*")
            .order("day_start", { ascending: true }),
          supabase
            .from("growth_over_time")
            .select("*")
            .order("week_start", { ascending: true }),
          supabase
            .from("growth_over_time_monthly")
            .select("*")
            .order("month_start", { ascending: true }),
        ]);
      setGrowthDaily(d || []);
      setGrowthWeekly(w || []);
      setGrowthMonthly(m || []);
      setLoadingBase(false);
    }
    loadBase();
  }, []);

  useEffect(() => {
async function loadLeaderboard() {
  setLoadingLeaderboard(true);
  let view =
    activeTab === "daily"
      ? "referrer_ranked_daily"
      : activeTab === "monthly"
      ? "referrer_ranked_monthly"
      : activeTab === "weekly"
      ? "referrer_ranked_weekly"
      : "referrer_ranked_alltime";

  const { data: rank, error } = await supabase
    .from(view)
    .select("*")
    .order(
      activeTab === "daily"
        ? "rank_daily"
        : activeTab === "monthly"
        ? "rank_monthly"
        : activeTab === "weekly"
        ? "rank_weekly"
        : "rank_alltime",
      { ascending: true }
    )
    .limit(leaderboardLimit);

  if (error) console.error(error);
  setRanked(rank || []);
  setLoadingLeaderboard(false);
}
    loadLeaderboard();
  }, [activeTab, leaderboardLimit]);

  const timeKey =
    activeTab === "daily"
      ? "day_start"
      : activeTab === "monthly"
      ? "month_start"
      : activeTab === "weekly"
      ? "week_start"
      : null;

  const activeGrowth = useMemo(() => {
    return activeTab === "daily"
      ? growthDaily
      : activeTab === "monthly"
      ? growthMonthly
      : activeTab === "weekly"
      ? growthWeekly
      : [];
  }, [activeTab, growthDaily, growthMonthly, growthWeekly]);

  // ----- compute chartData -----
  const chartData = useMemo(() => {
    if (!timeKey || !activeGrowth.length) return [];
    const delta = (c, p) => c - p;
    return activeGrowth.map((g, i) => {
      const m0 = Number(g.total_new_members || 0);
      const r0 = Number(g.referred_members || 0);
      const v0 = Number(g.verified_members || 0);
      const b0 = Number(g.verified_and_referred_members || 0);

      let m = m0,
        r = r0,
        v = v0,
        b = b0;
      if (chartMode === "change" && i > 0) {
        const prev = activeGrowth[i - 1];
        m = delta(m0, Number(prev.total_new_members || 0));
        r = delta(r0, Number(prev.referred_members || 0));
        v = delta(v0, Number(prev.verified_members || 0));
        b = delta(b0, Number(prev.verified_and_referred_members || 0));
      }

      let onlyRef = Math.max(0, r - b);
      let onlyVer = Math.max(0, v - b);
      let both = Math.max(0, b);
      let other = Math.max(0, m - (onlyRef + onlyVer + both));

      let members = Math.max(0, m);
      if (chartScale === "percent") {
        const f = (x) => (members > 0 ? (x / members) * 100 : 0);
        onlyRef = f(onlyRef);
        onlyVer = f(onlyVer);
        both = f(both);
        other = f(other);
      }

      return {
        label: (g[timeKey] || "").slice(0, 10),
        only_referred: onlyRef,
        only_verified: onlyVer,
        both,
        other,
        only_referred_c: r - b,
        only_verified_c: v - b,
        both_c: b,
        other_c: m - (r - b + v - b + b),
        members_c: m,
      };
    });
  }, [activeGrowth, chartMode, chartScale, timeKey]);

  // legend totals
const legendTotals = useMemo(() => {
  let members = 0,
    other = 0,
    onlyR = 0,
    onlyV = 0,
    both = 0;
  chartData.forEach((d) => {
    members += d.members_c;
    other += d.other_c;
    onlyR += d.only_referred_c;
    onlyV += d.only_verified_c;
    both += d.both_c;
  });
  return { members, other, onlyR, onlyV, both };
}, [chartData]);

  // tooltip includes total line
  const tooltipFormatter = (value, name, props) => {
    const p = props.payload || {};
    const keyMap = {
      other: "other_c",
      only_referred: "only_referred_c",
      only_verified: "only_verified_c",
      both: "both_c",
    };
    const count = p[keyMap[props.dataKey]] ?? 0;
    const denom = p.members_c > 0 ? p.members_c : 1;
    const pct = Math.round((count / denom) * 100);
    if (chartScale === "percent") {
      return [`${Math.round(value)}% (${count})`, name];
    } else {
      return [`${count} (${pct}%)`, name];
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    const totalCount =
      data.only_referred_c + data.only_verified_c + data.both_c + data.other_c;
    return (
      <div className="bg-white border border-gray-300 p-1.5 rounded shadow-sm">
        <p className="text-[11px] mb-1">{label}</p>
        {payload.map((entry, idx) => {
          const val = tooltipFormatter(entry.value, entry.name, entry);
          return (
            <p
              key={idx}
              style={{ color: entry.color }}
              className="text-[11px]"
            >
              {entry.name}: {val[0]}
            </p>
          );
        })}
        <p className="mt-1 border-t border-gray-200 pt-1 text-[11px] font-semibold text-gray-800">
          {chartScale === "percent"
            ? `Total: 100% (${totalCount})`
            : `Total: ${totalCount} (100%)`}
        </p>
      </div>
    );
  };

  const legendPayload = [
    { value: `Members (${legendTotals.members})`, type: "square", color: COLOR_MEMBERS },
    { value: `Other (${legendTotals.other})`, type: "square", color: COLOR_OTHER },
    { value: `Referred (${legendTotals.onlyR})`, type: "square", color: COLOR_ONLY_REF },
    { value: `Verified (${legendTotals.onlyV})`, type: "square", color: COLOR_ONLY_VER },
    { value: `Verified+Ref (${legendTotals.both})`, type: "square", color: "url(#vrGrad)" },
  ];

  const yDomain = chartScale === "percent" ? [0, 100] : ["auto", "auto"];
  const tabs = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
    { key: "all", label: "All-time" },
  ];

  return (
    <div className="text-left mb-6 font-mono text-xs text-gray-700">
  {/* Tabs */}
<div className="flex flex-wrap gap-2 mb-3">
  {tabs.map((t) => (
    <button
      key={t.key}
      onClick={() => {
        setActiveTab(t.key);
        // preserve summary/referrers open/closed state when switching tabs
        setChartMode("totals");
        setChartScale("percent");
        setShowChart(true);
        setLeaderboardLimit(10);
      }}
      className={`px-4 py-1.5 rounded-full border transition-colors ${
        activeTab === t.key
          ? "bg-gray-800 text-white border-gray-800"
          : "border-gray-300 text-gray-700 hover:bg-gray-100"
      }`}
    >
      {t.label}
    </button>
  ))}
</div>

      {/* Chart section */}
{(activeTab !== "all" || activeTab === "all") && (
  <div className="mb-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
    {/* Overview header with pill toggles; toggles hide when collapsed */}
    <div className="flex items-center justify-between mb-2">
      <p className="font-semibold text-gray-800">
        🔵 {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Overview
      </p>

      {showChart && (
        <div className="flex flex-wrap gap-2">
          {["Σ", "Δ"].map((symbol, i) => (
            <button
              key={symbol}
              onClick={() => setChartMode(i === 0 ? "totals" : "change")}
              className={`px-3 py-1 rounded-full border text-[11px] ${
                chartMode === (i === 0 ? "totals" : "change")
                  ? "bg-gray-800 text-white border-gray-800"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {symbol}
            </button>
          ))}
          {["n", "%"].map((symbol, i) => (
            <button
              key={symbol}
              onClick={() => setChartScale(i === 0 ? "counts" : "percent")}
              className={`px-3 py-1 rounded-full border text-[11px] ${
                chartScale === (i === 0 ? "counts" : "percent")
                  ? "bg-gray-800 text-white border-gray-800"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {symbol}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowChart((v) => !v)}
        className="text-xs text-blue-600 hover:underline"
      >
        {showChart ? "Hide ▲" : "Show ▼"}
      </button>
    </div>

    {showChart && (
      <>
        <svg width="0" height="0">
          <defs>
            <linearGradient id="vrGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>
        </svg>

        {loadingBase ? (
          <p className="text-sm text-gray-600">loading chart…</p>
        ) : activeTab === "all" ? (
          // 🟢 All-time view → cumulative line chart over daily data
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <LineChart
                data={growthDaily.map((g, i, arr) => {
                  // accumulate cumulatively
                  const prev = i > 0 ? arr[i - 1] : {};
                  const m = (prev.total_new_members || 0) + (g.total_new_members || 0);
                  const r = (prev.referred_members || 0) + (g.referred_members || 0);
                  const v = (prev.verified_members || 0) + (g.verified_members || 0);
                  const b = (prev.verified_and_referred_members || 0) + (g.verified_and_referred_members || 0);
                  const onlyRef = Math.max(0, r - b);
                  const onlyVer = Math.max(0, v - b);
                  const both = Math.max(0, b);
                  const other = Math.max(0, m - (onlyRef + onlyVer + both));
                  return {
                    label: g.day_start?.slice(0, 10),
                    other,
                    referred: onlyRef,
                    verified: onlyVer,
                    both,
                  };
                })}
                margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: "11px" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="other" name="Other" stroke={COLOR_OTHER} dot={false} />
                <Line type="monotone" dataKey="referred" name="Referred" stroke="#f97316" dot={false} />
                <Line type="monotone" dataKey="verified" name="Verified" stroke="#16a34a" dot={false} />
                <Line type="monotone" dataKey="both" name="Verified+Ref" stroke="url(#vrGrad)" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : chartData.length === 0 ? (
          <p className="text-gray-500 italic text-xs">No data available.</p>
        ) : (
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis
                  domain={yDomain}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) =>
                    chartScale === "percent"
                      ? `${Math.round(Math.min(Math.max(v, 0), 100))}%`
                      : v
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} payload={legendPayload} />
                <Bar dataKey="other" name="Other" stackId="a" fill={COLOR_OTHER} />
                <Bar dataKey="only_referred" name="Referred" stackId="a" fill="#f97316" />
                <Bar dataKey="only_verified" name="Verified" stackId="a" fill="#16a34a" />
                <Bar dataKey="both" name="Verified+Ref" stackId="a" fill="url(#vrGrad)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </>
    )}
  </div>
)}

      {/* --- Summary (collapsed by default; Add More Columns) --- */}
      <div className="mb-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
        <div className="flex items-center justify-between">
<p className="font-semibold text-gray-800">
  {activeTab === "all"
    ? "🔵 All-time Summary"
    : `🔵 ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Summary`}
</p>
<div className="flex gap-2">
  <button
    onClick={() => setChartMode("totals")}
    className={`px-3 py-1 rounded-full border text-[11px] ${
      chartMode === "totals"
        ? "bg-gray-800 text-white border-gray-800"
        : "border-gray-300 text-gray-700 hover:bg-gray-100"
    }`}
  >
     Σ
  </button>
  <button
    onClick={() => setChartMode("change")}
    className={`px-3 py-1 rounded-full border text-[11px] ${
      chartMode === "change"
        ? "bg-gray-800 text-white border-gray-800"
        : "border-gray-300 text-gray-700 hover:bg-gray-100"
    }`}
  >
    Δ
  </button>
</div>

          <button
            onClick={() => setShowSummary((s) => !s)}
            className="text-xs text-blue-600 hover:underline"
          >
            {showSummary ? "Hide ▲" : "Show ▼"}
          </button>
        </div>

        {showSummary && (
  loadingBase ? (
    <p className="text-sm text-gray-600 mt-2">loading summary…</p>
  ) : activeTab === "all" ? (
    <div className="mt-2">
      <div className="overflow-x-auto">
        <table className="min-w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-gray-300 text-gray-600">
              <th className="text-left pr-3">Metric</th>
              <th className="text-right pr-3">Daily</th>
              <th className="text-right pr-3">Weekly</th>
              <th className="text-right pr-3">Monthly</th>
              <th className="text-right pr-3">All Time</th>
            </tr>
          </thead>
          <tbody>
            {summaryMatrix.rows.map((r) => (
              <tr key={r.key} className="border-b border-gray-100">
                <td className="text-left pr-3">
                  <span
                    className="inline-block w-3 h-3 rounded-sm mr-2 align-middle"
                    style={
                      r.key === "both"
                        ? { backgroundImage: "linear-gradient(90deg,#f97316,#16a34a)" }
                        : { backgroundColor: r.color }
                    }
                  />
                  {r.label}
                </td>
                {["daily", "weekly", "monthly", "alltime"].map((period) => {
                  const src =
                    period === "daily"
                      ? growthDaily.at(-1)
                      : period === "weekly"
                      ? growthWeekly.at(-1)
                      : period === "monthly"
                      ? growthMonthly.at(-1)
                      : summaryMatrix.cols[0]?.values;

                  let vals;
                  if (!src) {
                    vals = { members: 0, other: 0, referred: 0, verified: 0, both: 0 };
                  } else if (src.members !== undefined) {
                    vals = src;
                  } else {
                    const m = Number(src.total_new_members || 0);
                    const r0 = Number(src.referred_members || 0);
                    const v0 = Number(src.verified_members || 0);
                    const b0 = Number(src.verified_and_referred_members || 0);
                    const onlyRef = Math.max(0, r0 - b0);
                    const onlyVer = Math.max(0, v0 - b0);
                    const both = Math.max(0, b0);
                    const other = Math.max(0, m - (onlyRef + onlyVer + both));
                    vals = { members: m, other, referred: onlyRef, verified: onlyVer, both };
                  }

                  return (
                    <td key={period} className="text-right pr-3">
                      {formatCell(r.key, vals)}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="font-semibold border-t border-gray-300">
              <td className="text-left pr-3">Total</td>
              {["daily", "weekly", "monthly", "alltime"].map((period) => {
                const src =
                  period === "daily"
                    ? growthDaily.at(-1)
                    : period === "weekly"
                    ? growthWeekly.at(-1)
                    : period === "monthly"
                    ? growthMonthly.at(-1)
                    : summaryMatrix.cols[0]?.values;
                const members =
                  src?.members ??
                  src?.total_new_members ??
                  0;
                return (
                  <td key={period} className="text-right pr-3">
                    {`${members} (100%)`}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  ) : summaryMatrix.cols.length === 0 ? (

            <p className="text-gray-500 italic text-xs mt-2">No data available.</p>
          ) : (
            <div className="mt-2">
              <div className="overflow-x-auto">
                <table className="min-w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-gray-300 text-gray-600">
                      <th className="text-left pr-3">Metric</th>
                      {summaryMatrix.cols.map((c) => (
                        <th key={c.header} className="text-right pr-3">
                          {c.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summaryMatrix.rows.map((r) => (
                      <tr key={r.key} className="border-b border-gray-100">
                        <td className="text-left pr-3">
                          {/* colored block matching legend */}
                          <span
                            className="inline-block w-3 h-3 rounded-sm mr-2 align-middle"
                            style={
                              r.key === "both"
                                ? { backgroundImage: "linear-gradient(90deg,#f97316,#16a34a)" }
                                : { backgroundColor: r.color }
                            }
                          />
                          <span className="align-middle">{r.label}</span>
                        </td>
                        {summaryMatrix.cols.map((c) => (
                          <td key={c.header} className="text-right pr-3">
                            {formatCell(r.key, c.values, summaryMatrix.cols.indexOf(c), summaryMatrix.cols)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {/* Total row (multi-column periods) */}
                    <tr className="font-semibold border-t border-gray-300">
                      <td className="text-left pr-3">Total</td>
                      {summaryMatrix.cols.map((c) => (
                        <td key={c.header} className="text-right pr-3">
                          {`${c.values?.members ?? 0} (100%)`}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Add more columns (older intervals horizontally) */}
              {activeGrowth.length > summaryMatrix.cols.length - 1 && (
                <button
                  onClick={() => setSummaryCols(summaryCols + 1)}
                  className="text-xs text-blue-600 mt-2 hover:underline"
                >
                  Add More Columns +
                </button>
              )}
            </div>
          )
        )}
      </div>

      {/* --- Leaderboard (collapsed by default; expandable by 10) --- */}
      <div className="border border-gray-200 rounded-lg p-3 shadow-sm bg-gray-50">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-800 flex items-center gap-2">
            {/* small referral/chain icon */}
            
            🔥 Top Referrers ({activeTab === "all" ? "All-time" : activeTab}, Top {leaderboardLimit})
          </p>
          <button
            onClick={() => setShowReferrers((s) => !s)}
            className="text-xs text-blue-600 hover:underline"
          >
            {showReferrers ? "Hide ▲" : "Show ▼"}
          </button>
        </div>

        {showReferrers && (
          loadingLeaderboard ? (
            <p className="text-gray-500 italic text-xs mt-2">loading leaderboard…</p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-300 text-gray-600">
                    <th className="text-left pr-3">#</th>
                    <th className="text-left pr-3">Referrer</th>
                    <th className="text-right pr-3">Total</th>
                    <th className="text-right pr-3">Verified</th>
                    <th className="text-right pr-3">%</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked && ranked.length > 0 ? (
                    ranked.map((r, idx) => (
                      <tr
                        key={r.referred_by_zcasher_id || r.referred_by || idx}
                        className="border-b border-gray-100 hover:bg-gray-100"
                      >
                        <td className="text-left pr-3">{r.rank_overall}</td>
                        <td className="text-left pr-3">
                          {(r.referred_by || "").slice(0, 14)}
                          {r.referred_by?.length > 14 ? "…" : ""}
                        </td>
                        <td className="text-right pr-3">{r.total_referrals}</td>
                        <td className="text-right pr-3">{r.verified_referrals}</td>
                        <td className="text-right pr-3">
                          {Math.round(r.verified_ratio_pct ?? 0)}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center text-gray-500 italic py-2">
                        No referrals for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Expand/collapse Top N by 10s */}
              <div className="mt-2 flex gap-3">
                <button
                  onClick={() => setLeaderboardLimit((n) => n + 10)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Show 10 More ▼
                </button>
                {leaderboardLimit > 10 && (
                  <button
                    onClick={() => setLeaderboardLimit(10)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Collapse All ▲
                  </button>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
  // after successful fetch of all three leaderboards:

}
