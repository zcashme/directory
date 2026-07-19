/**
 * findAccount + ZNS name resolution — both query the zcasher table
 * in Supabase Postgres via Prisma.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ZcasherRow {
  address: string | null;
  name: string | null;
  display_name: string | null;
  profile_image_url: string | null;
}

/**
 * Resolve a Zcash name to an address + profile.
 * Queries the zcasher table directly (case-insensitive name match).
 * If the input looks like a Zcash address (u1, z, t1 prefix), returns it as-is.
 */
export async function resolveName(input: string): Promise<ZcasherRow | null> {
  // Direct address — skip ZNS lookup
  if (/^(u1|z|t1)/.test(input)) {
    return { address: input, name: null, display_name: null, profile_image_url: null };
  }

  const rows = await prisma.$queryRaw<ZcasherRow[]>`
    SELECT address, name, display_name, profile_image_url
    FROM zcasher
    WHERE LOWER(name) = LOWER(${input})
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * oidc-provider findAccount — loads an account by Zcash address.
 * Returns claims from the zcasher table for ID tokens and userinfo.
 */
export async function findAccount(_ctx: any, id: string) {
  const rows = await prisma.$queryRaw<ZcasherRow[]>`
    SELECT address, name, display_name, profile_image_url
    FROM zcasher
    WHERE address = ${id}
    LIMIT 1
  `;
  const profile = rows[0];

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