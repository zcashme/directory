// Type definitions for profileUtils
import type { Profile, ProfileTrust, ProfileTrustWarning, RankType } from "@/types";

export function getProfileTrust(profile: Partial<Profile> | unknown): ProfileTrust;

export function getProfileWarning(profile: Partial<Profile> | unknown): ProfileTrustWarning;

export function getRankType(profile: Partial<Profile> | unknown): RankType;

export function getCircleClass(isVerified: boolean, rankType: RankType): string;
