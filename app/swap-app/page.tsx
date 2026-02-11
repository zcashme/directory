import SwapAppClient from "./SwapAppClient";

export default function SwapsPage({
  searchParams,
}: {
  searchParams: { depositAddress?: string };
}) {
  return <SwapAppClient initialDepositAddress={searchParams.depositAddress || null} />;
}
