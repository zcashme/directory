"use server";

import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { normalizeZnsName, isValidZnsName, buildWaitlistReserveMemo, zip321Uri } from "@/lib/zns/name";

const DEFAULT_RESERVE_ADDRESS =
  "u1lgqp0jc6efr7fj43emg66wc4x500c8ylesuv0mcsa87ua0qc9qcgyxe9hk2840knvc28gtce42hlerhwsuds5lpll7n7cfmqj9ccsmzskjel859w434ayvlnvhmmsg0wmdyf3nsppzqpsl54vq9n6599glgxlgtag03a92fekglk2fqhekd3ft306khvvwfzsjw56xr9hxfdkz4qxgc";

function getReservePaymentAddress(): string {
  return process.env.WAITLIST_RESERVE_PAYMENT_ADDRESS?.trim() || DEFAULT_RESERVE_ADDRESS;
}

function getReserveFeeZec(): string {
  const value = process.env.WAITLIST_RESERVE_FEE_ZEC?.trim();
  if (value && /^\d+(\.\d{1,8})?$/.test(value) && Number(value) > 0) return value;
  return "0.005";
}

function parseZecToZats(value: string): number {
  const [wholePart, fractionPart = ""] = value.split(".");
  const paddedFraction = `${fractionPart}00000000`.slice(0, 8);
  return Number(wholePart) * 100_000_000 + Number(paddedFraction);
}

export interface ReserveSession {
  ok: boolean;
  error?: string;
  waitlistId?: string;
  name?: string;
  memo?: string;
  address?: string;
  amountZec?: string;
  uri?: string;
  reserved?: boolean;
  reservedAt?: string | null;
  reservedTxid?: string | null;
  referralCode?: string | null;
}

const REFERRAL_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const MAX_REFERRAL_CODE_RETRIES = 8;

function generateReferralCode(): string {
  return Array.from({ length: 8 }, () => (
    REFERRAL_CODE_CHARS[Math.floor(Math.random() * REFERRAL_CODE_CHARS.length)]
  )).join("");
}

async function generateUniqueReferralCode(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>
): Promise<string> {
  for (let attempt = 0; attempt < MAX_REFERRAL_CODE_RETRIES; attempt += 1) {
    const candidate = generateReferralCode();
    const { data } = await supabase
      .from("zn_waitlist")
      .select("id")
      .eq("referral_code", candidate)
      .limit(1)
      .maybeSingle();
    if (!data) return candidate;
  }
  return generateReferralCode();
}

const WAITLIST_ROW_COLUMNS = "id, name, name_reserved, name_reserved_at, name_reserved_txid, zcasher_id, referral_code";

type WaitlistRow = {
  id: string;
  name?: string | null;
  name_reserved?: boolean | null;
  name_reserved_at?: string | null;
  name_reserved_txid?: string | null;
  zcasher_id?: number | null;
  referral_code?: string | null;
};

async function loadProfile(profileId: number) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { supabase: null, profile: null };
  const { data } = await supabase
    .from("zcasher")
    .select("id, name, address, zns_waitlist_id")
    .eq("id", profileId)
    .maybeSingle();
  return { supabase, profile: data };
}

async function linkProfileAndWaitlist(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  profileId: number,
  waitlistId: string,
  currentZcasherId?: number | null,
) {
  await supabase.from("zcasher").update({ zns_waitlist_id: waitlistId }).eq("id", profileId);
  if (Number(currentZcasherId) !== profileId) {
    await supabase.from("zn_waitlist").update({ zcasher_id: profileId }).eq("id", waitlistId);
  }
}

async function findWaitlistRow(
  supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>,
  profileId: number,
  waitlistId: string,
): Promise<WaitlistRow | null> {
  if (waitlistId) {
    const { data } = await supabase
      .from("zn_waitlist")
      .select(WAITLIST_ROW_COLUMNS)
      .eq("id", waitlistId)
      .maybeSingle();
    if (data?.id) return data as WaitlistRow;
  }

  const { data } = await supabase
    .from("zn_waitlist")
    .select(WAITLIST_ROW_COLUMNS)
    .eq("zcasher_id", profileId)
    .maybeSingle();
  return (data as WaitlistRow | null) ?? null;
}

export async function ensureWaitlistReservationAction(profileId: number): Promise<ReserveSession> {
  try {
    const { supabase, profile } = await loadProfile(profileId);
    if (!supabase || !profile) return { ok: false, error: "Profile not found." };

    const name = normalizeZnsName(profile.name ?? "");
    if (!isValidZnsName(name)) {
      return { ok: false, error: "This username cannot be reserved as a Zcash Name." };
    }

    const linkedWaitlistId = typeof profile.zns_waitlist_id === "string" ? profile.zns_waitlist_id : "";
    const existing = await findWaitlistRow(supabase, profileId, linkedWaitlistId);
    if (existing?.id) {
      await linkProfileAndWaitlist(supabase, profileId, existing.id, existing.zcasher_id);
      return buildSession(existing, name);
    }

    const insertPayload: Record<string, unknown> = {
      name,
      email: null,
      email_verified: false,
      newsletter: false,
      referral_code: await generateUniqueReferralCode(supabase),
      zcasher_id: profileId,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("zn_waitlist")
      .insert(insertPayload)
      .select(WAITLIST_ROW_COLUMNS)
      .single();

    if (insertError || !inserted?.id) {
      const conflict = await findWaitlistRow(supabase, profileId, "");
      if (conflict?.id) {
        await linkProfileAndWaitlist(supabase, profileId, conflict.id, conflict.zcasher_id);
        return buildSession(conflict, name);
      }
      return {
        ok: false,
        error: insertError?.message || "Could not create a waitlist reservation.",
      };
    }

    await supabase.from("zcasher").update({ zns_waitlist_id: inserted.id }).eq("id", profileId);
    return buildSession(inserted as WaitlistRow, name);
  } catch (error) {
    return { ok: false, error: String((error as Error)?.message || error) };
  }
}

export async function getWaitlistReservationStatusAction(profileId: number): Promise<ReserveSession | null> {
  try {
    const { supabase, profile } = await loadProfile(profileId);
    if (!supabase || !profile) return null;

    const linkedWaitlistId = typeof profile.zns_waitlist_id === "string" ? profile.zns_waitlist_id : "";
    const existing = await findWaitlistRow(supabase, profileId, linkedWaitlistId);
    if (!existing?.id || existing.name_reserved !== true) return null;

    let referralCode = (existing.referral_code ?? "").trim();
    if (!referralCode) {
      referralCode = await generateUniqueReferralCode(supabase);
      await supabase.from("zn_waitlist").update({ referral_code: referralCode }).eq("id", existing.id);
    }

    return buildSession({ ...existing, referral_code: referralCode }, normalizeZnsName(profile.name ?? ""));
  } catch {
    return null;
  }
}

export async function checkWaitlistReservationAction(profileId: number): Promise<ReserveSession> {
  try {
    const session = await ensureWaitlistReservationAction(profileId);
    if (!session.ok || !session.waitlistId || session.reserved) return session;

    const supabase = createSupabaseServerClient();
    if (!supabase) return session;

    const minimumZats = parseZecToZats(session.amountZec || getReserveFeeZec());
    const paymentAddress = getReservePaymentAddress();
    const { data: rows } = await supabase
      .from("zn_waitlist_reserves_transactions")
      .select("amount_zats, detected_at, memo, txid, is_outgoing, status, recipient_address")
      .eq("is_outgoing", false)
      .eq("recipient_address", paymentAddress)
      .in("status", ["mempool", "confirmed"])
      .ilike("memo", `%UUID::${session.waitlistId}%`)
      .order("detected_at", { ascending: true })
      .limit(25);

    const match = (rows ?? []).find((row) => {
      const memo = String(row.memo ?? "");
      if (!memo.includes(`UUID::${session.waitlistId}`)) return false;
      if (session.name && !memo.toLowerCase().includes(`name::${session.name}`.toLowerCase())) return false;
      const amount = Number(row.amount_zats);
      return Number.isFinite(amount) && amount >= minimumZats;
    });

    if (!match) return session;

    await supabase
      .from("zn_waitlist")
      .update({
        name_reserved: true,
        name_reserved_at: match.detected_at,
        name_reserved_txid: match.txid,
      })
      .eq("id", session.waitlistId);

    return {
      ...session,
      reserved: true,
      reservedAt: match.detected_at,
      reservedTxid: match.txid,
    };
  } catch (error) {
    return { ok: false, error: String((error as Error)?.message || error) };
  }
}

function buildSession(
  row: {
    id: string;
    name?: string | null;
    name_reserved?: boolean | null;
    name_reserved_at?: string | null;
    name_reserved_txid?: string | null;
    referral_code?: string | null;
  },
  fallbackName: string
): ReserveSession {
  const name = normalizeZnsName(row.name || fallbackName);
  const memo = buildWaitlistReserveMemo(name, row.id);
  const address = getReservePaymentAddress();
  const amountZec = getReserveFeeZec();
  return {
    ok: true,
    waitlistId: row.id,
    name,
    memo,
    address,
    amountZec,
    uri: zip321Uri(address, amountZec, memo),
    reserved: row.name_reserved === true,
    reservedAt: row.name_reserved_at ?? null,
    reservedTxid: row.name_reserved_txid ?? null,
    referralCode: (row.referral_code ?? "").trim() || null,
  };
}
