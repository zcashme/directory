"use server";

import { oneclickStatus } from "@/lib/swap/oneClick";

export async function getSwapStatus(params) {
  const { depositAddress, depositMemo } = params;

  if (!depositAddress) {
    return { ok: false, error: "Missing deposit address", retryable: true };
  }

  const statusParams = { depositAddress };
  if (depositMemo) statusParams.depositMemo = depositMemo;

  const status = await oneclickStatus(statusParams);
  if (status.error) {
    return { ok: false, error: status.error, retryable: true };
  }

  return { ok: true, status };
}
