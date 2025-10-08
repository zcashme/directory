import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useFeedback } from "./store";
import Directory from "./Directory";

export default function ZcashProfile() {
  const { slug } = useParams();
  const { setSelectedAddress } = useFeedback();

  useEffect(() => {
    // When user visits /<slug>, lookup the matching address in Supabase
    async function fetchProfile() {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/public_profile?name=eq.${slug}&select=address`,
        {
          headers: {
            apiKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );
      const data = await res.json();
      if (data?.length && data[0].address) {
        setSelectedAddress(data[0].address);
      }
    }
    fetchProfile();
  }, [slug, setSelectedAddress]);

  // The Directory component will show the namecard + feedback form
  return <Directory />;
}
