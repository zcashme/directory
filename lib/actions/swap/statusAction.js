"use server";

import { oneclickStatus } from "@/lib/oneClick";

export async function getSwapStatus(params) {
  try {
    const { depositAddress, depositMemo } = params;

    if (!depositAddress) {
      return { ok: false, error: "Missing depositAddress", retryable: true };
    }

    const statusParams = { depositAddress };
    if (depositMemo) statusParams.depositMemo = depositMemo;

    const status = await oneclickStatus(statusParams);
    return { ok: true, status };
  } catch (e) {
    return {
      ok: false,
      error: String(e?.message || e),
      retryable: true,
    };
  }
}
