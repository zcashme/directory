import { notFound } from "next/navigation";
import ProfilePage from "./ProfilePage";
import { fetchProfileForSlug } from "@/lib/profile/profileFetcher";
import { getProfileCount, getDuplicateNameCount } from "@/lib/profile/profileQueries";

export default async function Page({ params }) {
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
