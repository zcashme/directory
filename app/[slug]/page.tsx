import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import ProfilePage from "./ProfilePage";
import { fetchProfileForSlug } from "@/lib/profile/profileFetcher";
import { getDuplicateNameCount } from "@/lib/profile/profileQueries";
import { buildSlug, getUsernameWithDiscriminator } from "@/lib/profile/profileUtils";
import { getSwapTokens } from "@/lib/swap/oneClick";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await fetchProfileForSlug(slug);

  if (!profile) {
    return {
      title: "Profile Not Found",
      description: "The requested profile could not be found.",
    };
  }

  const username = getUsernameWithDiscriminator(profile);
  const visibleName = profile.display_name || username || slug;

  return {
    title: `${visibleName} | Zcash.me`,
    description: profile.bio || `Zcash profile for ${username || slug}`,
    icons: {
      icon: profile.profile_image_url || "/favicon.ico",
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  const profile = await fetchProfileForSlug(slug);

  if (!profile) {
    notFound();
  }

  const canonicalSlug = buildSlug(profile);
  const requestedSlug = decodeURIComponent(slug || "").trim().toLowerCase();
  if (canonicalSlug && requestedSlug !== canonicalSlug.toLowerCase()) {
    redirect(`/${canonicalSlug}`);
  }

  const [duplicateNameCount, tokensResult] = await Promise.all([
    profile.name ? getDuplicateNameCount(profile.name) : 0,
    getSwapTokens(),
  ]);

  const tokens = 'tokens' in tokensResult ? tokensResult.tokens : [];

  return (
    <ProfilePage
      initialProfile={profile}
      duplicateNameCount={duplicateNameCount}
      tokens={tokens}
    />
  );
}
