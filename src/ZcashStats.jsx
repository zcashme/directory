import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export default function ZcashStats() {
  const [loading, setLoading] = useState(true);
  const [line, setLine] = useState("");
  const [referralLine, setReferralLine] = useState("");
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({
    referred: 0,
    claimed: 0,
    verified: 0,
  });

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from("public_profile")
        .select("since, status_computed, last_signed_at, referred_by");

      if (error) {
        console.error("Error fetching data:", error);
        setLine("Error loading stats.");
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setLine("no user data available.");
        setLoading(false);
        return;
      }

      // --- Count how many joined per date ---
      const countsByDate = {};
      data.forEach((d) => {
        const date = d.since?.slice(0, 10);
        if (!date || date < "2025-08-27") return;
        countsByDate[date] = (countsByDate[date] || 0) + 1;
      });

      // --- Build sorted list and compute daily change (n) ---
      let cumulative = 0;
      const sorted = Object.entries(countsByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => {
          cumulative += count;
          return { date, total: cumulative, change: count };
        });

      setTotal(cumulative);

      // --- Generate bar lines for each day ---
      const barLines = sorted.map((d, i) => {
        const prevTotal = i > 0 ? sorted[i - 1].total : 0;
        const n = d.total - prevTotal;
        const N = d.total;
        const len = Math.min(30, Math.abs(n));
        const bar = n >= 0 ? "▇".repeat(len) : "▁".repeat(len);
        const sign = n > 0 ? "+" : n < 0 ? "−" : " ";
        return `${d.date.slice(5)} ${bar} ${sign}${n} (${N})`;
      });

      // --- Summary counts ---
      const referred = data.filter((d) => d.referred_by && d.referred_by.trim()).length;
      const claimed = data.filter((d) => d.status_computed === "claimed").length;
      const verified = data.filter((d) => !!d.last_signed_at).length;
      setCounts({ referred, claimed, verified });

      // --- Referral frequency chart ---
      const refCounts = {};
      data.forEach((d) => {
        let ref = d.referred_by?.trim();
        if (!ref) return;
        ref = ref
          .replace(/^https?:\/\/(www\.)?zcash\.me\//i, "")
          .replace(/^zcash\.me\//i, "");
        refCounts[ref] = (refCounts[ref] || 0) + 1;
      });

      const refSorted = Object.entries(refCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([ref, n]) => `${ref.padEnd(15)} ${"▇".repeat(n)} ${n}`);

      setLine(barLines.join("\n"));
      setReferralLine(refSorted.join("\n"));
      setLoading(false);
    }

    fetchData();
  }, []);

  return (
    <div className="text-left mb-6 pl-0 ml-1">
      {loading ? (
        <p className="text-sm text-gray-700">loading stats...</p>
      ) : (
        <div className="overflow-x-auto mt-2 text-left font-mono text-xs text-gray-700">
          <p className="text-gray-600 mb-2">
            {total} total names since 8/27/2025: {counts.referred} referred •{" "}
            {counts.verified} verified*
          </p>

          {referralLine && (
            <>
              <p className="font-semibold text-gray-700 mb-1">referral frequency</p>
              <pre className="whitespace-pre leading-tight mb-4">{referralLine}</pre>
            </>
          )}

          <p className="font-semibold text-gray-700 mb-1">daily join activity</p>
          <pre className="whitespace-pre leading-tight mb-4">{line}</pre>

          <p className="text-gray-500 text-[10px] italic mt-2">
            *Coming soon: verify accounts
          </p>
        </div>
      )}
    </div>
  );
}
