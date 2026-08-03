/**
 * Account lookup + Zcash name resolution.
 *
 * Both query the zcasher table in Supabase Postgres via the
 * Supabase JS client — same database as the directory app.
 */

import { supabase } from "./supabase.js";

interface ZcasherRow {
  address: string | null;
  name: string | null;
  display_name: string | null;
  profile_image_url: string | null;
}

/**
 * Resolve a Zcash name to an address + profile.
 * Queries the zcasher table (case-insensitive name match).
 * If the input looks like a Zcash address (u1, z, t1 prefix), returns it as-is.
 */
export async function resolveName(input: string): Promise<ZcasherRow | null> {
  // Direct address — skip lookup
  if (/^(u1|z|t1)/.test(input)) {
    return { address: input, name: null, display_name: null, profile_image_url: null };
  }

  // Escape ILIKE wildcards in the input for an exact case-insensitive match
  const escaped = input.replace(/[%_]/g, "\\$&");

  const { data, error } = await supabase
    .from("zcasher")
    .select("address,name,display_name,profile_image_url")
    .ilike("name", escaped)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`resolveName failed: ${error.message}`);
  return data ?? null;
}

/**
 * oidc-provider findAccount — loads an account by Zcash address.
 * Returns claims from the zcasher table for ID tokens and userinfo.
 */
export async function findAccount(_ctx: any, id: string) {
  const { data: profile, error } = await supabase
    .from("zcasher")
    .select("address,name,display_name,profile_image_url")
    .eq("address", id)
    .maybeSingle();

  if (error) throw new Error(`findAccount failed: ${error.message}`);

  return {
    accountId: id,
    async claims() {
      return {
        sub: id,
        name: profile?.name ?? profile?.display_name ?? null,
        preferred_username: profile?.name ?? null,
        picture: profile?.profile_image_url ?? null,
        zcash_address: id,
      };
    },
  };
}