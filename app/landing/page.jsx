import LandingPage from "./LandingPage";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Zcash.me — Landing Preview",
};

export default async function LandingPreviewPage() {
  const supabase = await createSupabaseServerClient();
  const { data: profiles } = await supabase
    .from("zcasher_searchable")
    .select("*")
    .order("name", { ascending: true })
    .limit(200);

  return <LandingPage profiles={profiles || []} />;
}
