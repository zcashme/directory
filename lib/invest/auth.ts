import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

const SESSION_COOKIE = "zcash_invest_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type InvestSession = {
  passwordId: string;
  accessEventId: number | null;
  expiresAt: number;
};

function getSessionSecret(): string | null {
  const secret = process.env.INVEST_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function isValidSignature(value: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(sign(value, secret));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function getInvestSession(): Promise<InvestSession | null> {
  const secret = getSessionSecret();
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!secret || !raw) return null;

  const [version, passwordId, accessEventIdText, expiresAtText, signature] = raw.split(".");
  if (version !== "v2" || !passwordId || !accessEventIdText || !expiresAtText || !signature) return null;

  const expiresAt = Number(expiresAtText);
  const accessEventId = Number(accessEventIdText);
  if (!Number.isSafeInteger(expiresAt) || !Number.isSafeInteger(accessEventId) || accessEventId <= 0 || expiresAt <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  const value = `${version}.${passwordId}.${accessEventIdText}.${expiresAtText}`;
  if (!isValidSignature(value, signature, secret)) return null;

  return { passwordId, accessEventId, expiresAt };
}

export async function authenticateInvestPassword(password: string): Promise<boolean> {
  const secret = getSessionSecret();
  const supabase = createSupabaseServerClient();
  if (!secret || !supabase || !password) return false;

  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const candidateIp = forwardedFor?.split(",")[0]?.trim() || "";
  // Avoid rejecting a legitimate password because a proxy supplied a non-IP value.
  const ipAddress = /^[0-9a-fA-F:.]+$/.test(candidateIp) ? candidateIp : null;
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 512) || null;

  // The RPC compares the password in Postgres and returns the logged access event.
  const { data, error } = await supabase.rpc("validate_and_log_invest_access_v2", {
    candidate_password: password,
    access_ip: ipAddress,
    access_user_agent: userAgent,
  });
  const passwordId = typeof data?.password_id === "string" ? data.password_id : null;
  const accessEventId = typeof data?.access_event_id === "number" ? data.access_event_id : null;
  if (error || !passwordId || !Number.isSafeInteger(accessEventId) || accessEventId <= 0) return false;

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const value = `v2.${passwordId}.${accessEventId}.${expiresAt}`;
  const sessionCookie = `${value}.${sign(value, secret)}`;

  (await cookies()).set(SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/invest",
    maxAge: SESSION_TTL_SECONDS,
  });

  return true;
}
