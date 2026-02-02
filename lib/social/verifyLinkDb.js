import { supabase } from "@/lib/supabase/supabase-client";

/**
 * Mark a zcasher_links row as verified, trying exact URL match first,
 * then falling back to ilike patterns.
 */
export async function updateLinkVerification(profileId, handle, variants, updatePayload) {
  let { data, error } = await supabase
    .from('zcasher_links')
    .update(updatePayload)
    .eq('zcasher_id', profileId)
    .in('url', variants)
    .select();

  if ((!data || data.length === 0) && !error) {
    const patternX = `%://x.com/${handle}%`;
    const patternTw = `%://twitter.com/${handle}%`;
    const patternWX = `%://www.x.com/${handle}%`;
    const patternWT = `%://www.twitter.com/${handle}%`;
    const patternLI = `%://linkedin.com/in/${handle}%`;
    const patternWLI = `%://www.linkedin.com/in/${handle}%`;
    const patternGH = `%://github.com/${handle}%`;
    const patternWGH = `%://www.github.com/${handle}%`;
    const patternD1 = `%://discord.com/users/${handle}%`;
    const patternD2 = `%://www.discord.com/users/${handle}%`;
    const patternDA = `%://discordapp.com/users/${handle}%`;
    const patternWDA = `%://www.discordapp.com/users/${handle}%`;
    const { data: data2, error: error2 } = await supabase
      .from('zcasher_links')
      .update(updatePayload)
      .eq('zcasher_id', profileId)
      .or(`url.ilike.${patternX},url.ilike.${patternTw},url.ilike.${patternWX},url.ilike.${patternWT},url.ilike.${patternLI},url.ilike.${patternWLI},url.ilike.${patternGH},url.ilike.${patternWGH},url.ilike.${patternD1},url.ilike.${patternD2},url.ilike.${patternDA},url.ilike.${patternWDA}`)
      .select();
    data = data2; error = error2;
  }

  if (error) {
    console.error("[VERIFY ERROR] DB Update error:", error);
    throw error;
  }
  if (!data || data.length === 0) {
    console.warn("[VERIFY WARN] No rows updated! Check if zcasher_id and url match exactly in DB.");
  }

  return { data, error };
}
