import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

export type InvestDocument = {
  title: string;
  subtitle: string | null;
  bodyMarkdown: string;
  details: InvestDetail[];
  updatedAt: string;
};

export type InvestDetail = {
  title: string;
  bodyMarkdown: string;
};

export async function getInvestDocument(): Promise<InvestDocument | null> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("invest_documents")
    .select("title,subtitle,body_markdown,details,updated_at")
    .eq("slug", "invest")
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) return null;

  return {
    title: data.title,
    subtitle: data.subtitle,
    bodyMarkdown: data.body_markdown,
    details: Array.isArray(data.details)
      ? data.details.filter((detail): detail is InvestDetail =>
        typeof detail === "object" && detail !== null &&
        typeof detail.title === "string" && typeof detail.bodyMarkdown === "string"
      )
      : [],
    updatedAt: data.updated_at,
  };
}
