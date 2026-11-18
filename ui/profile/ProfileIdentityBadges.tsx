import type { Profile } from "@/lib/profile/types";
import { isZnsActiveProfile } from "@/lib/profile/profileUtils";
import { formatZnsZecLabel, znsExplorerHref } from "@/lib/zns/name";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";

interface ProfileIdentityBadgesProps {
  profile: Partial<Profile>;
  collapsedOnly?: boolean;
}

export default function ProfileIdentityBadges({
  profile,
  collapsedOnly = false,
}: ProfileIdentityBadgesProps) {
  const isZns = isZnsActiveProfile(profile);
  const isVerified = Boolean(profile.address_verified || (profile.verified_links_count ?? 0) > 0);
  const znsName = profile.zns_name || profile.name || "";

  return (
    <>
      {isZns ? (
        <VerifiedBadge
          verified
          variant="zcashName"
          verifiedLabel={formatZnsZecLabel(znsName)}
          collapsedOnly={collapsedOnly}
          href={znsExplorerHref(znsName)}
        />
      ) : null}
      {isVerified && !isZns ? <VerifiedBadge verified collapsedOnly={collapsedOnly} /> : null}
    </>
  );
}
