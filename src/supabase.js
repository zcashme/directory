import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
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
      refund_amount,
      processed
    `)
    .not("refund_amount", "is", null)
    .gt("refund_amount", 0)
    .or("processed.eq.false,processed.is.null")
    .order("mined_time", { ascending: true });
}


export async function markRefundProcessed(txid) {
  return supabase
    .from("staging_unified")
    .update({ processed: true })
    .eq("txid", txid);
}

window.supabase = supabase;
