import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// The real client for Auth and Data
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function getPendingRefunds() {
  return supabase
    .from("staging_unified")
    .select(`
      txid,
      mined_time,
      zcasher_id,
      zcasher_name,
      zcasher_address,
      outgoing_message,
      refund_status,
      amount
    `)
    .eq("refund_status", "pending");
}

export async function processRefund(txid, action) {
  // action = 'approve' or 'deny'
  return supabase
    .from("staging_unified")
    .update({ 
      refund_status: action === "approve" ? "approved" : "denied",
      processed_at: new Date().toISOString()
    })
    .eq("txid", txid);
}
