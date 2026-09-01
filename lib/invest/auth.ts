import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";

const SESSION_COOKIE = "zcash_invest_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type InvestSession = {
  passwordId: string;
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

  const [version, passwordId, expiresAtText, signature] = raw.split(".");
  if (version !== "v1" || !passwordId || !expiresAtText || !signature) return null;

  const expiresAt = Number(expiresAtText);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  const value = `${version}.${passwordId}.${expiresAtText}`;
  if (!isValidSignature(value, signature, secret)) return null;

  return { passwordId, expiresAt };
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

  // The RPC compares the password in Postgres and logs only the matched password ID.
  const { data, error } = await supabase.rpc("validate_and_log_invest_access", {
    candidate_password: password,
    access_ip: ipAddress,
    access_user_agent: userAgent,
  });
  const passwordId = typeof data === "string" ? data : null;
  if (error || !passwordId) return false;

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const value = `v1.${passwordId}.${expiresAt}`;
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
