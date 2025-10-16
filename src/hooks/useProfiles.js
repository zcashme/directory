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

    supabase
.from("public_profile")
.select("*, links:zcasher_links(id, label, url, is_verified, created_at)")

      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Error loading profiles:", error);
        } else {
          cachedProfiles = data;
          setProfiles(data);
        }
      })
      .finally(() => setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  return { profiles, loading };
}
