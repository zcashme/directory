// src/hooks/useProfiles.js
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabase-client";

let cachedProfiles = null; // memory cache across reloads

export default function useProfiles(initialProfiles = null, revalidate = true) {
  const hasInitial = initialProfiles !== null;

  if (!cachedProfiles && Array.isArray(initialProfiles)) {
    cachedProfiles = initialProfiles;
  }

  const [profiles, setProfiles] = useState(cachedProfiles || initialProfiles || []);
  const [loading, setLoading] = useState(!cachedProfiles && !hasInitial);

  useEffect(() => {
    let active = true;

    async function fetchAllProfiles() {
      if (!revalidate) return;
      if (!hasInitial) setLoading(true);

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

          if (error) break;

          all = all.concat(data || []);
          total = count || total;



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



        if (process.env.NODE_ENV === "development" && enriched.length === 0) {
          enriched = [
            {
              id: 999001,
              name: "Local Test",
              slug: "local_test",
              address: "u1qtestzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
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
        }

        if (active) {
          cachedProfiles = enriched;
          if (typeof window !== "undefined") window.cachedProfiles = enriched;
          setProfiles(enriched);
          if (!hasInitial) setLoading(false);

        }
      } catch (err) {
        if (process.env.NODE_ENV === "development" && active) {
          const fallback = [
            {
              id: 999001,
              name: "Local Test",
              slug: "local_test",
              address: "u1qtestzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
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
          if (!hasInitial) setLoading(false);
        }
      }
    }

    fetchAllProfiles();

    return () => {
      active = false;
    };
  }, [hasInitial, revalidate]);

  const addProfile = (newProfile) => {
    const enriched = {
      rank_alltime: 0,
      rank_weekly: 0,
      rank_monthly: 0,
      address_verified: false,
      links: [],
      verified_links_count: 0,
      ...newProfile,
      links: newProfile.links || []
    };

    setProfiles((prev) => [...prev, enriched]);

    if (cachedProfiles) {
      cachedProfiles.push(enriched);
    }
  };

  return { profiles, loading, addProfile };
}

export { cachedProfiles };
if (typeof window !== "undefined") window.cachedProfiles = cachedProfiles;
