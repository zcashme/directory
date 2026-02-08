// Type definitions for profileUtils
import type { Profile, ProfileTrust, ProfileTrustWarning, RankType } from "@/lib/profile/types";

export function getProfileTrust(_profile: Partial<Profile> | unknown): ProfileTrust;

export function getProfileWarning(_profile: Partial<Profile> | unknown): ProfileTrustWarning;

export function getRankType(_profile: Partial<Profile> | unknown): RankType;

export function getCircleClass(_isVerified: boolean, _rankType: RankType): string;
