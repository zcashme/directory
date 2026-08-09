import SupabaseAdapter from "../adapter.js";
import type { PgpzProofLink } from "./pgpz.js";

const paymentSessions = new SupabaseAdapter("PaymentSession");
const PAYMENT_SESSION_TTL_SECONDS = 10 * 60;

export interface PaymentSession {
  profileId: number;
  interactionUid?: string;
  demo: boolean;
  pgpzProof?: PgpzProofLink;
}

export async function createPaymentSession(
  sessionId: string,
  session: PaymentSession,
): Promise<void> {
  await paymentSessions.upsert(sessionId, session, PAYMENT_SESSION_TTL_SECONDS);
}

export async function getPaymentSession(
  sessionId: string,
): Promise<(PaymentSession & { consumed?: true }) | undefined> {
  return paymentSessions.find(sessionId) as Promise<
    (PaymentSession & { consumed?: true }) | undefined
  >;
}

export async function consumePaymentSession(sessionId: string): Promise<void> {
  await paymentSessions.consume(sessionId);
}
