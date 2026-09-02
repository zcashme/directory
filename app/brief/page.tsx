import type { Metadata } from "next";
import BriefPage from "../invest/BriefPage";
import "../invest/invest.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Brief | ZcashMe",
  robots: { index: false, follow: false },
};

type BriefRoutePageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function BriefRoutePage({ searchParams }: BriefRoutePageProps) {
  return <BriefPage route="/brief" searchParams={searchParams} />;
}
