import { supabase } from "@/lib/supabase/supabase-client";

export async function confirmOtp(zcasherId, otp) {
  return supabase.rpc("confirm_otp_sql", { in_zcasher_id: zcasherId, in_otp: otp });
}
