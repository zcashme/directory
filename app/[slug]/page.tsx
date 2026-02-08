import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProfilePage from "./ProfilePage";
import { fetchProfileForSlug } from "@/lib/profile/profileFetcher";
import { getProfileCount, getDuplicateNameCount } from "@/lib/profile/profileQueries";

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

  return {
    title: `${profile.display_name || profile.name || slug} | Zcash.me`,
    description: profile.bio || `Zcash profile for ${profile.name || slug}`,
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

  const [profileCount, duplicateNameCount] = await Promise.all([
    getProfileCount(),
    profile.name ? getDuplicateNameCount(profile.name) : 0,
  ]);

  return (
    <ProfilePage
      initialProfile={profile}
      profileCount={profileCount}
      duplicateNameCount={duplicateNameCount}
    />
  );
}
