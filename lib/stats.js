import { createSupabaseServerClient } from "./supabase-server";

export async function fetchStatsData() {
  const supabase = createSupabaseServerClient();

  try {
    const [{ data: daily }, { data: weekly }, { data: monthly }] =
      await Promise.all([
        supabase
          .from("growth_over_time_daily")
          .select("*")
          .order("day_start", { ascending: true }),
        supabase
          .from("growth_over_time")
          .select("*")
          .order("week_start", { ascending: true }),
        supabase
          .from("growth_over_time_monthly")
          .select("*")
          .order("month_start", { ascending: true }),
      ]);

    return {
      growthDaily: daily || [],
      growthWeekly: weekly || [],
      growthMonthly: monthly || [],
    };
  } catch (err) {
    console.error("Stats fetch failed:", err);
    return { growthDaily: [], growthWeekly: [], growthMonthly: [] };
  }
}

export async function fetchLeaderboard(period = "weekly", limit = 10) {
  const supabase = createSupabaseServerClient();

  const view =
    period === "daily"
      ? "referrer_ranked_daily"
      : period === "monthly"
        ? "referrer_ranked_monthly"
        : period === "weekly"
          ? "referrer_ranked_weekly"
          : "referrer_ranked_alltime";

  const sortKey =
    period === "daily"
      ? "rank_daily"
      : period === "monthly"
        ? "rank_monthly"
        : period === "weekly"
          ? "rank_weekly"
          : "rank_alltime";

  try {
    const { data, error } = await supabase
      .from(view)
      .select("*")
      .order(sortKey, { ascending: true })
      .limit(limit);

    if (error) {
      console.error("Leaderboard fetch failed:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Leaderboard fetch failed:", err);
    return [];
  }
}
