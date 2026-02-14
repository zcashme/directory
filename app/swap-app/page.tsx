import SwapAppClient from "./SwapAppClient";

export default async function SwapsPage({
  searchParams,
}: {
  searchParams: Promise<{ depositAddress?: string }>;
}) {
  const params = await searchParams;
  return (
    <div
      className="min-h-screen p-4 md:p-8 pt-16"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="max-w-6xl mx-auto">
        <SwapAppClient initialDepositAddress={params.depositAddress || null} />
      </div>
    </div>
  );
}
