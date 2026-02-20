import type { CSSProperties } from "react";
import type { Profile, EnrichedProfileLink } from "@/lib/profile/types";

export type Variant = "default" | "mobile";
export type LinkVariant = "default" | "simple";

export interface LinkRowClasses {
  row: string;
  left: string;
  leftLink: string;
  right: string;
  icon: string;
  iconStyle?: CSSProperties;
  label: string;
  labelStyle?: CSSProperties;
  domain: string;
  domainStyle?: CSSProperties;
  copySize?: "xs" | "sm" | "md";
  copyScale?: number;
  copyWrapper?: string;
}

export interface ProfileLinkRowProps {
  link: EnrichedProfileLink;
  classes: LinkRowClasses;
  hideBadge?: boolean;
  badgeLabels?: { verified: string; unverified: string };
  stopPropagation?: boolean;
  onVerifyClick?: (link: EnrichedProfileLink) => void;
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
  fullView?: boolean;
  duplicateNameCount?: number;
  onShowQR?: () => void;
  onEditorModeChange?: (isEditorOpen: boolean) => void;
  onGenerateVerificationQr?: () => void;
  cardWidthPx?: number;
}
