// src/hooks/useProfiles.js
import { useEffect, useState } from "react";
import { supabase } from "../supabase";

let cachedProfiles = null; // memory cache across reloads

export default function useProfiles() {
  const [profiles, setProfiles] = useState(cachedProfiles || []);
  const [loading, setLoading] = useState(!cachedProfiles);

  useEffect(() => {
    let active = true;

    async function fetchAllProfiles() {
      setLoading(true);

      try {
        const [{ data: lbAll }, { data: lbWeek }, { data: lbMonth }] = await Promise.all([
          supabase
            .from("referrer_ranked_alltime")
            .select("referred_by_zcasher_id, rank_alltime")
            .order("rank_alltime", { ascending: true })
            .limit(10),
          supabase
            .from("referrer_ranked_weekly")
            .select("referred_by_zcasher_id, rank_weekly")
            .order("rank_weekly", { ascending: true })
            .limit(10),
          supabase
            .from("referrer_ranked_monthly")
            .select("referred_by_zcasher_id, rank_monthly")
            .order("rank_monthly", { ascending: true })
            .limit(10),
        ]);


        const toKey = (v) => String(v);

        const rankAll = new Map(
          (lbAll || []).map((r) => [toKey(r.referred_by_zcasher_id), r.rank_alltime])
        );
        const rankWeek = new Map(
          (lbWeek || []).map((r) => [toKey(r.referred_by_zcasher_id), r.rank_weekly])
        );
        const rankMonth = new Map(
          (lbMonth || []).map((r) => [toKey(r.referred_by_zcasher_id), r.rank_monthly])
        );


        const pageSize = 1000;
        let from = 0;
        let all = [];
        let total = 0;

        while (true) {
          const { data, error, count } = await supabase
            .from("zcasher_searchable")
            .select("*", { count: "exact" })
            .order("name", { ascending: true })
            .range(from, from + pageSize - 1);

          if (error) {
            console.error("❌ Error loading profiles:", error);
            break;
          }

          all = all.concat(data || []);
          total = count || total;

          console.log(`📦 fetched ${data?.length || 0} (total so far: ${all.length}/${total})`);

          if (!data?.length || all.length >= total) break;
          from += pageSize;
        }

        let enriched = all.map((p) => {
          const pid = String(p.id);

          const addressVerified =
            p.address_verified ||
            p.verified ||
            false;

          const linkList =
            p.links ||
            p.zcasher_links ||
            [];

          const linkVerifiedCount =
            p.verified_links_count ??
            linkList.filter((l) => l.is_verified).length;

          return {
            ...p,

            rank_alltime: rankAll.get(pid) || 0,
            rank_weekly: rankWeek.get(pid) || 0,
            rank_monthly: rankMonth.get(pid) || 0,

            address_verified: addressVerified,
            links: linkList,
            verified_links_count: linkVerifiedCount,
          };
        });

        const test = enriched.find((p) => p.name === "Zechariah");
        if (test) {
          console.log("🧩 Debug Zechariah:", {
            id: test.id,
            rank_alltime: test.rank_alltime,
            rank_weekly: test.rank_weekly,
            rank_monthly: test.rank_monthly,
          });
        }

        if (import.meta.env.DEV && enriched.length === 0) {
          enriched = [
            {
              id: 999001,
              name: "Local Test",
              slug: "local_test",
              address: "u1qtestzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
              address_verified: true,
              verified_links_count: 0,
              links: [],
              bio: "Offline demo profile for local development",
              featured: false,
              rank_alltime: 0,
              rank_weekly: 0,
              rank_monthly: 0,
            },
          ];
          console.warn("⚠️ Supabase unavailable — using offline demo profile");
        }

        if (active) {
          cachedProfiles = enriched;
          if (typeof window !== "undefined") window.cachedProfiles = enriched;
          setProfiles(enriched);
          setLoading(false);
          console.log(`✅ Loaded ${enriched.length} profiles`);
        }
      } catch (err) {
        console.error("❌ Profiles fetch failed:", err);
        if (import.meta.env.DEV && active) {
          const fallback = [
            {
              id: 999001,
              name: "Local Test",
              slug: "local_test",
              address: "u1qtestzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
              address_verified: true,
              verified_links_count: 0,
              links: [],
              bio: "Offline demo profile for local development",
              featured: false,
              rank_alltime: 0,
              rank_weekly: 0,
              rank_monthly: 0,
            },
          ];
          cachedProfiles = fallback;
          if (typeof window !== "undefined") window.cachedProfiles = fallback;
          setProfiles(fallback);
          setLoading(false);
          console.warn("⚠️ Using offline demo profile due to fetch error");
        }
      }
    }

    fetchAllProfiles();

    return () => {
      active = false;
    };
  }, []);

  return { profiles, loading };
}

export { cachedProfiles };
if (typeof window !== "undefined") window.cachedProfiles = cachedProfiles;
