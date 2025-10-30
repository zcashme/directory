import { useEffect, useState } from "react";
import { supabase } from "../supabase";

let cachedProfiles = null; // memory cache

export default function useProfiles() {
  const [profiles, setProfiles] = useState(cachedProfiles || []);
  const [loading, setLoading] = useState(!cachedProfiles);

  useEffect(() => {
    if (cachedProfiles) return; // already cached, skip fetch

    let active = true;
    setLoading(true);

    async function fetchAllProfiles() {
      const pageSize = 1000;
      let from = 0;
      let all = [];
      let total = 0;

      while (true) {
        const { data, error, count } = await supabase
          .from("zcasher_with_referral_rank")
          .select("*", { count: "exact" }) // no join (same as before)
          .order("name", { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) {
          console.error("Error loading profiles:", error);
          break;
        }

        all = all.concat(data || []);
        total = count || total;

        console.log(`📦 fetched ${data?.length || 0} (total so far: ${all.length}/${total})`);

        if (!data?.length || all.length >= total) break;
        from += pageSize;
      }

      if (active) {
        console.log(`✅ Loaded ${all.length} profiles (count: ${total})`);
        cachedProfiles = all;
        window.cachedProfiles = all;
        setProfiles(all);
        setLoading(false);
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
