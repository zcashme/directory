import type { MouseEvent } from "react";
import type { Profile, EnrichedProfileLink, ProfileTrustWarning } from "@/lib/profile/types";

export type Variant = "default" | "mobile" | "compact";
export type LinkVariant = "default" | "simple";

export interface LinkRowClasses {
  row: string;
  left: string;
  leftLink: string;
  right: string;
  icon: string;
  label: string;
  domain: string;
  copySize?: "xs" | "sm" | "md";
  copyWrapper?: string;
}

export interface ProfileLinkRowProps {
  link: EnrichedProfileLink;
  classes: LinkRowClasses;
  hideBadge?: boolean;
  badgeLabels?: { verified: string; unverified: string };
  badgeOnClick?: (event: MouseEvent, link: EnrichedProfileLink) => void;
  stopPropagation?: boolean;
}

export interface ProfileCardTextScale {
  displayName: number;
  verifiedBadge: number;
  username: number;
  bio: number;
  meta: number;
  address: number;
  addressCopy: number;
  linkIcon: number;
  linkLabel: number;
  linkDomain: number;
  linkMore: number;
  linkCopy: number;
  viewProfile: number;
}

export interface ProfileCardContentProps {
  profile: Profile;
  linksArray?: EnrichedProfileLink[];
  variant?: Variant;
  showLinks?: boolean;
  showAddress?: boolean;
  showBio?: boolean;
  showDates?: boolean;
  showQRButton?: boolean;
  onQRClick?: () => void;
  linkVariant?: LinkVariant;
  hideLinkBadges?: boolean;
  className?: string;
  textScaleOverrides?: Partial<ProfileCardTextScale>;
  showDisplayNameVerifiedBadge?: boolean;
}

export interface RedirectModalProps {
  isOpen: boolean;
  label: string;
}

export interface ProfileCardProps {
  profile: Profile;
  onSelect?: (profile: Profile) => void;
  warning?: ProfileTrustWarning | null;
  fullView?: boolean;
  duplicateNameCount?: number;
  onShowQR?: () => void;
}
