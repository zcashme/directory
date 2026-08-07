/**
 * OIDC claims — maps ZcashMe profiles to OIDC token claims.
 */

import { supabase } from "../supabase.js";

/**
 * oidc-provider findAccount — loads an account by Zcash address.
 * Returns claims for ID tokens and userinfo.
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
        zcashme_profile_url: profile?.name ? `zcash.me/${profile.name}` : null,
      };
    },
  };
}