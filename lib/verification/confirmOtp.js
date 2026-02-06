import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

export async function confirmOtp(zcasherId, otp) {
  const supabase = createSupabaseServerClient();
  return supabase.rpc("confirm_otp_sql", { in_zcasher_id: zcasherId, in_otp: otp });
}
