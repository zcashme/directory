/**
 * Supabase adapter for oidc-provider.
 *
 * Stores all oidc-provider state (sessions, codes, tokens, grants,
 * interactions) in the zm_auth_state table in Supabase Postgres.
 * Clients are hardcoded in provider.ts — no DB lookup needed.
 */

import { supabase } from "./supabase.js";

const types: Record<string, number> = {
  Session: 1,
  AccessToken: 2,
  AuthorizationCode: 3,
  RefreshToken: 4,
  DeviceCode: 5,
  ClientCredentials: 6,
  InitialAccessToken: 8,
  RegistrationAccessToken: 9,
  Interaction: 10,
  ReplayDetection: 11,
  PushedAuthorizationRequest: 12,
  Grant: 13,
  BackchannelAuthenticationRequest: 14,
  PaymentSession: 15,
};

function expiresAt(expiresIn?: number): string | null {
  return expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
}

/**
 * Unpack a DB row into the shape oidc-provider expects: spread the
 * JSON payload and add `consumed: true` if the row has a consumedAt.
 */
function prepare(row: { payload: Record<string, unknown>; consumedAt: string | null } | null | undefined) {
  if (!row) return undefined;
  return {
    ...row.payload,
    ...(row.consumedAt ? { consumed: true } : undefined),
  };
}

/**
 * Check expiry — returns undefined if the row has expired or is null.
 */
function checkExpiry<T extends { expiresAt: string | null }>(row: T | null): T | undefined {
  if (!row) return undefined;
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) return undefined;
  return row;
}

export default class SupabaseAdapter {
  type: number;

  constructor(name: string) {
    this.type = types[name] ?? 0;
  }

  async upsert(id: string, payload: any, expiresIn?: number) {
    const data = {
      id,
      type: this.type,
      payload: payload as Record<string, unknown>,
      grantId: payload.grantId ?? null,
      userCode: payload.userCode ?? null,
      uid: payload.uid ?? null,
      expiresAt: expiresAt(expiresIn),
    };

    const { error } = await supabase
      .from("zm_auth_state")
      .upsert(data, { onConflict: "id,type" });

    if (error) throw new Error(`adapter upsert failed: ${error.message}`);
  }

  async find(id: string) {
    const { data, error } = await supabase
      .from("zm_auth_state")
      .select("payload,consumedAt,expiresAt")
      .eq("id", id)
      .eq("type", this.type)
      .maybeSingle();
    if (error) throw new Error(`adapter find failed: ${error.message}`);

    const row = checkExpiry(data);
    return prepare(row);
  }

  async findByUserCode(userCode: string) {
    const { data, error } = await supabase
      .from("zm_auth_state")
      .select("payload,consumedAt,expiresAt")
      .eq("userCode", userCode)
      .maybeSingle();
    if (error) throw new Error(`adapter findByUserCode failed: ${error.message}`);

    const row = checkExpiry(data);
    return prepare(row);
  }

  async findByUid(uid: string) {
    const { data, error } = await supabase
      .from("zm_auth_state")
      .select("payload,consumedAt,expiresAt")
      .eq("uid", uid)
      .maybeSingle();
    if (error) throw new Error(`adapter findByUid failed: ${error.message}`);

    const row = checkExpiry(data);
    return prepare(row);
  }

  async consume(id: string) {
    const { error } = await supabase
      .from("zm_auth_state")
      .update({ consumedAt: new Date().toISOString() })
      .eq("id", id)
      .eq("type", this.type);
    if (error) throw new Error(`adapter consume failed: ${error.message}`);
  }

  async destroy(id: string) {
    const { error } = await supabase
      .from("zm_auth_state")
      .delete()
      .eq("id", id)
      .eq("type", this.type);
    if (error) throw new Error(`adapter destroy failed: ${error.message}`);
  }

  async revokeByGrantId(grantId: string) {
    const { error } = await supabase
      .from("zm_auth_state")
      .delete()
      .eq("grantId", grantId);
    if (error) throw new Error(`adapter revokeByGrantId failed: ${error.message}`);
  }
}
