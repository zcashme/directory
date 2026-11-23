import { ogCardForProfile } from "@/lib/og/profileOgCard";
import { contentType, OG_SAMPLE, renderProfileOgImage, size } from "@/lib/og/renderProfileOg";
import { resolveProfileSlug } from "@/lib/profile/usernameResolution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export { size, contentType };

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let card = OG_SAMPLE;

  try {
    const resolved = await resolveProfileSlug(slug);
    if (resolved.kind === "profile") {
      card = await ogCardForProfile(resolved.profile, slug);
    }
  } catch {
    card = OG_SAMPLE;
  }

  return renderProfileOgImage(card);
}
