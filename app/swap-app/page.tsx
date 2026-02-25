import SwapAppClient from "./SwapAppClient";
import { getSwapTokens } from "@/lib/swap/oneClick";

export default async function SwapsPage({
  searchParams,
}: {
  searchParams: Promise<{ depositAddress?: string }>;
}) {
  const [params, tokensResult] = await Promise.all([
    searchParams,
    getSwapTokens(),
  ]);
  const tokens = tokensResult.ok ? tokensResult.data : [];

  return (
    <div
      className="min-h-screen p-4 md:p-8 pt-16"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="max-w-6xl mx-auto">
        <SwapAppClient
          initialDepositAddress={params.depositAddress || null}
          initialTokens={tokens}
        />
      </div>
    </div>
  );
}
