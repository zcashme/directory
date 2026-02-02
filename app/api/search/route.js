import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json([]);
  }

  const supabase = createSupabaseServerClient();

  const { data } = await supabase
    .from("zcasher_searchable")
    .select("*")
    .or(
      `display_name.ilike.%${q}%,name.ilike.%${q}%,link_search_text.ilike.%${q}%,address.eq.${q}`
    )
    .limit(20);

  return NextResponse.json(data || []);
}
