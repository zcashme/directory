import HomePage from "./HomePage";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const { data: featuredProfiles } = await supabase
    .from("zcasher_searchable")
    .select("*")
    .eq("featured", true)
    .limit(8);

  return <HomePage featuredProfiles={featuredProfiles || []} />;
}
