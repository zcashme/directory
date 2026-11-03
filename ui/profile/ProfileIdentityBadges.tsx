import type { Profile } from "@/lib/profile/types";
import { isZnsActiveProfile } from "@/lib/profile/profileUtils";
import { formatZnsZecLabel, znsExplorerHref } from "@/lib/zns/name";
import NetworkSchoolBadge from "@/ui/profile/NetworkSchoolBadge";
import VerifiedBadge from "@/ui/profile/VerifiedBadge";
import { isTruthyProfileFlag } from "@/ui/profile/profileCardUtils";

const NETWORK_STATE_HREF = "https://ns.com/zcashusersgroup/apply";

interface ProfileIdentityBadgesProps {
  profile: Partial<Profile>;
  collapsedOnly?: boolean;
}

export default function ProfileIdentityBadges({
  profile,
  collapsedOnly = false,
}: ProfileIdentityBadgesProps) {
  const isNs = isTruthyProfileFlag(profile.is_ns);
  const isZns = isZnsActiveProfile(profile);
  const isVerified = Boolean(profile.address_verified || (profile.verified_links_count ?? 0) > 0);
  const znsName = profile.zns_name || profile.name || "";

  return (
    <>
      {isNs ? <NetworkSchoolBadge href={NETWORK_STATE_HREF} /> : null}
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
