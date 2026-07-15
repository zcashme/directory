/**
 * Prisma adapter for oidc-provider — copied from the contributed adapter.
 * https://github.com/panva/node-oidc-provider/blob/v8.x/example/adapters/contributed/prisma.ts
 *
 * Stores all oidc-provider state (sessions, codes, tokens, grants, interactions)
 * in the OidcModel table in Supabase Postgres.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const types: Record<string, number> = {
  Session: 1,
  AccessToken: 2,
  AuthorizationCode: 3,
  RefreshToken: 4,
  DeviceCode: 5,
  ClientCredentials: 6,
  Client: 7,
  InitialAccessToken: 8,
  RegistrationAccessToken: 9,
  Interaction: 10,
  ReplayDetection: 11,
  PushedAuthorizationRequest: 12,
  Grant: 13,
  BackchannelAuthenticationRequest: 14,
};

function prepare(doc: { payload: unknown; consumedAt: Date | null }) {
  const payload =
    doc.payload && typeof doc.payload === "object" && !Array.isArray(doc.payload)
      ? (doc.payload as Record<string, unknown>)
      : {};
  return {
    ...payload,
    ...(doc.consumedAt ? { consumed: true } : undefined),
  };
}

function expiresAt(expiresIn?: number): Date | null {
  return expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
}

export default class PrismaAdapter {
  type: number;

  constructor(name: string) {
    this.type = types[name] ?? 0;
  }

  async upsert(id: string, payload: any, expiresIn?: number) {
    const data = {
      type: this.type,
      payload: payload as any,
      grantId: payload.grantId ?? null,
      userCode: payload.userCode ?? null,
      uid: payload.uid ?? null,
      expiresAt: expiresAt(expiresIn),
    };

    await prisma.zcashAuthState.upsert({
      where: { id_type: { id, type: this.type } },
      update: data,
      create: { id, ...data },
    });
  }

  async find(id: string) {
    if (this.type === 7) {
      const doc = await prisma.zcashOidcClient.findUnique({ where: { id } });
      if (!doc) return undefined;
      return doc.payload as Record<string, unknown>;
    }

    const doc = await prisma.zcashAuthState.findUnique({
      where: { id_type: { id, type: this.type } },
    });
    if (!doc || (doc.expiresAt && doc.expiresAt < new Date())) return undefined;
    return prepare(doc);
  }

  async findByUserCode(userCode: string) {
    const doc = await prisma.zcashAuthState.findFirst({ where: { userCode } });
    if (!doc || (doc.expiresAt && doc.expiresAt < new Date())) return undefined;
    return prepare(doc);
  }

  async findByUid(uid: string) {
    const doc = await prisma.zcashAuthState.findFirst({ where: { uid } });
    if (!doc || (doc.expiresAt && doc.expiresAt < new Date())) return undefined;
    return prepare(doc);
  }

  async consume(id: string) {
    await prisma.zcashAuthState.update({
      where: { id_type: { id, type: this.type } },
      data: { consumedAt: new Date() },
    });
  }

  async destroy(id: string) {
    await prisma.zcashAuthState.delete({
      where: { id_type: { id, type: this.type } },
    });
  }

  async revokeByGrantId(grantId: string) {
    await prisma.zcashAuthState.deleteMany({ where: { grantId } });
  }
}