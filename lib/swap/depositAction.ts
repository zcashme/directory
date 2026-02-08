"use server";

import { oneclickDepositSubmit } from "./oneClick";
import type { ServerActionResult } from "@/lib/actions/types";

interface DepositTxHashParams {
  txHash: string;
  depositAddress: string;
}

export async function submitDepositTxHash({ txHash, depositAddress }: DepositTxHashParams): Promise<ServerActionResult<unknown>> {
  if (!txHash || !txHash.trim()) {
    return { ok: false, error: "Transaction hash is required" };
  }

  if (!depositAddress || !depositAddress.trim()) {
    return { ok: false, error: "Deposit address is missing" };
  }

  try {
    const result = await oneclickDepositSubmit({
      txHash: txHash.trim(),
      depositAddress: depositAddress.trim(),
    });

    if (typeof result === "object" && result !== null && "error" in result && result.error) {
      return { ok: false, error: result.error as string };
    }

    return { ok: true, data: result as unknown };
  } catch (error) {
    return { ok: false, error: (error as Error).message || "Failed to submit transaction hash" };
  }
}
