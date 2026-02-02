import SplashPage from "./SplashPage";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: profiles } = await supabase
    .from("zcasher_searchable")
    .select("*")
    .order("created_at", { ascending: false });

  return <SplashPage profiles={profiles || []} />;
}
