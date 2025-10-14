import computeGoodThru from "./computeGoodThru";
export default function enrichProfile(profile) {
  const good_thru = computeGoodThru(profile.since, profile.last_signed_at);
  return { ...profile, good_thru };
}
