import type { Metadata } from "next";
import HomePage from "./HomePage";
import { fetchFeaturedProfilesServer } from "@/lib/directory/fetchFeaturedProfiles.server";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

// Disable ISR — always serve fresh content on every request
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Zcash.me",
  description: "Zcash.me directory and profiles.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: PageProps) {
  const [resolvedSearchParams, featuredProfiles] = await Promise.all([
    searchParams,
    fetchFeaturedProfilesServer(5),
  ]);

  let initialJoinParams: { prefillReferrer: string; prefillReferrerId: number } | null = null;

  if (resolvedSearchParams.join === "1") {
    const rawId = (resolvedSearchParams.referred_by_id as string ?? "").trim();
    const referredById = parseInt(rawId, 10);

    if (Number.isInteger(referredById) && referredById > 0) {
      const supabase = createSupabaseServerClient();
      if (supabase) {
        const { data } = await supabase
          .from("zcasher_searchable")
          .select("id, name")
          .eq("id", referredById)
          .limit(1)
          .maybeSingle();

        if (data?.name && data?.id) {
          initialJoinParams = {
            prefillReferrer: data.name as string,
            prefillReferrerId: data.id as number,
          };
        }
      }
    }
  }

  return <HomePage initialFeaturedProfiles={featuredProfiles} initialJoinParams={initialJoinParams} />;
}
