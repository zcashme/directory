import SwapAppClient from "./SwapAppClient";

export default function SwapsPage({
  searchParams,
}: {
  searchParams: { depositAddress?: string };
}) {
  return (
    <div
      className="p-4 md:p-8 pt-16"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="max-w-5xl mx-auto">
        <SwapAppClient initialDepositAddress={searchParams.depositAddress || null} />
      </div>
    </div>
  );
}
