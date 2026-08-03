/**
 * Shared Supabase client for the auth service.
 *
 * Uses the service role key to bypass RLS — this is a server-side-only
 * process that must read/write OIDC state and the zcasher table.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SERVICE_KEY are required.\n" +
    "Set them in your .env file (same values as the directory app)."
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});