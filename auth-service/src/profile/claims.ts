/**
 * OIDC claims — maps ZcashMe profiles to OIDC token claims.
 */

import { supabase } from "../supabase.js";

/**
 * oidc-provider findAccount — loads an account by stable ZcashMe profile ID.
 * Returns claims for ID tokens and userinfo.
 */
export async function findAccount(_ctx: any, id: string) {
  if (!/^\d+$/.test(id)) return undefined;

  const { data: profile, error } = await supabase
    .from("zcasher")
    .select("id,address,name,display_name,profile_image_url")
    .eq("id", Number(id))
    .maybeSingle();

  if (error) throw new Error(`findAccount failed: ${error.message}`);

  if (!profile) return undefined;

  return {
    accountId: String(profile.id),
    async claims() {
      return {
        sub: String(profile.id),
        name: profile?.display_name ?? null,
        username: profile?.name ?? null,
        picture: profile?.profile_image_url ?? null,
        zcash_unified_address: profile?.address ?? null,
      };
    },
  };
}
