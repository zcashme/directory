import { notFound } from "next/navigation";
import ProfilePageClient from "@/ui/profile/ProfilePageClient";
import { fetchProfileForSlug } from "../../lib/profile";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProfilePage({ params }) {
  const profile = await fetchProfileForSlug(params.slug);

  if (!profile) {
    notFound();
  }

  return <ProfilePageClient profile={profile} />;
}
