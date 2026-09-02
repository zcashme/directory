import type { Metadata } from "next";
import BriefPage from "./BriefPage";
import "./invest.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Brief | ZcashMe",
  robots: { index: false, follow: false },
};

type InvestPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function InvestPage({ searchParams }: InvestPageProps) {
  return <BriefPage route="/invest" searchParams={searchParams} />;
}
