import { supabase } from "@/lib/supabase/supabase-client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export function getSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
