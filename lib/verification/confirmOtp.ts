import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import type { OTPConfirmResponse } from "@/types/api";

interface SupabaseRpcResult {
  data: OTPConfirmResponse | null;
  error: Error | null;
}

export async function confirmOtp(zcasherId: number | string, otp: string): Promise<SupabaseRpcResult> {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { data: null, error: new Error("Supabase client not available") };
  }

  return supabase.rpc("confirm_otp_sql", { in_zcasher_id: zcasherId, in_otp: otp });
}
