"use server";

import { oneclickDepositSubmit } from "./oneClick";

export async function submitDepositTxHash({ txHash, depositAddress }) {
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

    if (result.error) {
      return { ok: false, error: result.error };
    }

    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: error.message || "Failed to submit transaction hash" };
  }
}
