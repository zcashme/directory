import type { Metadata } from "next";
import HomePage from "./HomePage";
import { fetchFeaturedProfilesServer } from "@/lib/directory/fetchFeaturedProfiles.server";

// Disable ISR — always serve fresh content on every request
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Zcash.me | Verified Zcash identities",
  description: "Verified Zcash identities. Shielded by default.",
  alternates: {
    canonical: "https://zcash.me/",
  },
  openGraph: {
    title: "Zcash.me",
    description: "Verified Zcash identities. Shielded by default.",
    url: "https://zcash.me/",
    images: [
      {
        url: "https://zcash.me/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Zcash.me homepage preview with verified profile card and zebra fingerprint",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zcash.me",
    description: "Verified Zcash identities. Shielded by default.",
    images: ["https://zcash.me/opengraph-image"],
  },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: PageProps) {
  const [resolvedSearchParams, featuredProfiles] = await Promise.all([
    searchParams,
    fetchFeaturedProfilesServer(5),
  ]);

  return <HomePage initialFeaturedProfiles={featuredProfiles} initialJoinOpen={resolvedSearchParams.join === "1"} />;
}
