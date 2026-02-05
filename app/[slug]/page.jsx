import { notFound } from "next/navigation";
import ProfilePageClient from "@/ui/profile/ProfilePageClient";
import { fetchProfileForSlug } from "@/lib/profile/profileFetcher";
import { getProfileCount, getDuplicateNameCount } from "@/lib/profile/profileQueries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProfilePage({ params }) {
  const { slug } = await params;
  const profile = await fetchProfileForSlug(slug);

  if (!profile) {
    notFound();
  }

  const profileCount = await getProfileCount();
  const duplicateNameCount = profile.name ? await getDuplicateNameCount(profile.name) : 0;

  return <ProfilePageClient profile={profile} profileCount={profileCount} duplicateNameCount={duplicateNameCount} />;
}
