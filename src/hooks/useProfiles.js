import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import enrichProfile from "../utils/enrichProfile";
export default function useProfiles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchProfiles() {
      const { data, error } = await supabase
        .from("public_profile")
        .select("name, since, status_computed, last_signed_at, address");
      if (error) console.error(error);
      else setProfiles((data || []).map(enrichProfile));
      setLoading(false);
    }
    fetchProfiles();
  }, []);
  return { profiles, loading };
}
