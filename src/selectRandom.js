import { supabase } from './supabase.js'

// Utility: turn names into URL-safe slugs (use this in your create flows too)
export function slugify(str = "") {
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")          // spaces → dashes
    .replace(/[^a-z0-9-]/g, "")    // strip non-url chars
    .replace(/-+/g, "-")           // collapse dashes
    .replace(/^-+|-+$/g, "");      // trim edge dashes
}

// --- Counts ---
export const getTotalCount = async () => {
  const { count, error } = await supabase
    .from("zcasher")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error getting total count:", error);
    return 0;
  }
  return count || 0;
};

// --- Random by offset (stable), then return with slug ---
export const getRandomZcasher = async (countMaybe) => {
  let total = Number(countMaybe);
  if (!Number.isFinite(total) || total <= 0) {
    total = await getTotalCount();
  }
  if (total <= 0) return null;

  const randomOffset = Math.floor(Math.random() * total);

  // Order by a stable column. If you have created_at or id, either works.
  const { data, error } = await supabase
    .from("zcasher")
    .select("*")
    .order("id", { ascending: true })
    .range(randomOffset, randomOffset)
    .limit(1);

  if (error) {
    console.error("Error fetching random zcasher:", error);
    return null;
  }

  const z = data?.[0] || null;
  // Ensure slug is present even if DB row hasn’t been backfilled yet.
  if (z) z.slug = z.slug || slugify(z.name || z.id);
  return z;
};

// --- Legacy by id (still exported in case you need it) ---
export const getZcasher = async (id) => {
  const { data, error } = await supabase
    .from("zcasher")
    .select("*")
    .eq("id", id)
    .limit(1);

  if (error) {
    console.error("Error fetching zcasher by id:", error);
    return null;
  }
  const z = data?.[0] || null;
  if (z) z.slug = z.slug || slugify(z.name || z.id);
  return z;
};

// --- Primary lookup by exact slug ---
export const getZcasherBySlug = async (slug) => {
  const clean = String(decodeURIComponent(slug || "")).toLowerCase();

  // 1) exact slug match (preferred)
  let { data, error } = await supabase
    .from("zcasher")
    .select("*")
    .eq("slug", clean)
    .limit(1);

  if (error) console.error("getZcasherBySlug eq(slug) error:", error);
  let z = data?.[0] || null;

  // 2) safety net for rows not backfilled yet — best-effort name match
  if (!z) {
    const nameCandidate = clean.replace(/-/g, " ").trim();
    const res = await supabase
      .from("zcasher")
      .select("*")
      .ilike("name", nameCandidate)
      .limit(1);
    if (res.error) console.error("getZcasherBySlug ilike(name) error:", res.error);
    z = res.data?.[0] || null;
  }

  if (z) z.slug = z.slug || slugify(z.name || z.id);
  return z;
};
