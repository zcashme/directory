import ProfileAvatar from "../ProfileAvatar";
import SocialLinks from "./SocialLinks";
import TagBadges from "./TagBadges";
import {
  getCountryFlag,
  getCountryName,
  getLastVerifiedLabel,
  getProfileLocation,
  getProfileTags,
  normalizeSlug,
} from "../../utils/directoryNsUtils";

export default function NsRow({
  profile,
  links,
  selectedAddress,
  onSelectAddress,
  onSetDraftMemo,
  onOpenProfile,
  onForceShowQR,
  onUnverifiedLink,
}) {
  const location = getProfileLocation(profile) || "-";
  const countryCode =
    profile?.iso2 ||
    (typeof profile?.country === "string" && profile.country.trim().length === 2
      ? profile.country
      : "");
  const countryFlag = getCountryFlag(countryCode || "");
  const tags = getProfileTags(profile);
  const lastVerified = getLastVerifiedLabel(profile);
  const addressValue = profile?.address || "";
  const addressDisplay = addressValue
    ? `${addressValue.slice(0, 6)}...${addressValue.slice(-6)}`
    : "-";
  const canShowAddressBar = addressDisplay !== "-";
  const bioText = profile?.bio?.trim() || profile?.tagline?.trim() || "";

  return (
    <div
      className="w-full text-left transition-transform duration-150 hover:scale-[1.01]"
      onClick={(event) => {
        const interactive = event.target.closest(
          "a,button,input,textarea,label,svg"
        );
        if (interactive) return;
        if (!profile?.address) return;
        onSelectAddress(profile.address);
        if (selectedAddress !== profile.address) {
          onSetDraftMemo("");
        }
        onOpenProfile(profile);
      }}
    >
      <div className="mt-3 grid items-center md:items-start gap-3 border border-gray-900 bg-white px-4 py-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.8fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.4fr)] rounded-none">
        <div className="flex min-w-0 items-center gap-3 overflow-hidden md:col-start-1 md:row-start-1">
          <ProfileAvatar
            profile={profile}
            size={72}
            imageClassName="object-contain"
            className="shadow-sm"
            showFallbackIcon
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-nowrap">
              <div className="min-w-0 text-base font-black tracking-tight text-gray-900">
                {profile?.display_name || profile?.name || "Unnamed"}
              </div>
              <TagBadges tags={tags} idPrefix={`${profile?.id}-`} />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
              <a
                href={`https://zcash.me/${normalizeSlug(
                  profile?.name || profile?.display_name || ""
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="flex max-w-full items-baseline gap-0 text-left hover:underline"
              >
                <span>Zcash.me/</span>
                <span>{profile?.name || profile?.display_name || "Unnamed"}</span>
              </a>
            </div>
          </div>
        </div>
        {bioText ? (
          <div className="text-sm text-gray-700 break-words md:hidden">
            {bioText}
          </div>
        ) : null}
        <div className="min-w-0 text-sm text-gray-700 break-words md:col-start-2 md:row-start-1">
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 md:hidden">
            Address
          </div>
          {canShowAddressBar ? (
            <div className="mt-1 inline-flex h-7 max-w-full items-center gap-2 border border-gray-900 bg-gray-50 px-3 text-[10px] font-mono text-gray-700 rounded-none">
              <span title={addressValue || addressDisplay}>{addressDisplay}</span>
              <div className="flex items-center gap-2 whitespace-nowrap">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!addressValue) return;
                    onSelectAddress(addressValue);
                    if (selectedAddress !== addressValue) {
                      onSetDraftMemo("");
                    }
                    onOpenProfile(profile);
                    onForceShowQR(Date.now());
                  }}
                  className={`flex items-center gap-1 px-1 text-xs transition-colors ${
                    addressValue
                      ? "text-gray-500 hover:text-blue-600"
                      : "cursor-not-allowed text-gray-300"
                  }`}
                  title="Show QR"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM18 14h2v6h-2zM14 18h3v2h-3z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>QR</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-1 text-xs text-gray-500">-</div>
          )}
        </div>
        <div className="min-w-0 text-xs font-semibold tracking-wide text-gray-700 break-words md:col-start-3 md:row-start-1 md:justify-self-start md:text-left">
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 md:hidden">
            Last Verified
          </div>
          {lastVerified}
        </div>
        <div className="min-w-0 text-xs font-semibold tracking-wide text-gray-700 md:col-start-4 md:row-start-1">
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 md:hidden">
            Nearest City
          </div>
          {location === "-" ? (
            <span className="text-xs text-gray-500">-</span>
          ) : (
            <span className="mt-1 inline-flex h-7 items-center gap-2 border border-gray-900 bg-gray-100 px-2 py-1 text-[10px] break-words rounded-none">
              {countryFlag ? (
                <span
                  className="text-sm leading-none"
                  style={{
                    fontFamily:
                      "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, Twemoji Mozilla, sans-serif",
                  }}
                  aria-hidden="true"
                >
                  {countryFlag}
                </span>
              ) : null}
              {location}
            </span>
          )}
        </div>
        <div className="min-w-0 md:col-start-5 md:row-start-1 md:self-start md:justify-self-start md:pt-1">
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500 md:hidden">
            Social
          </div>
          {links.length ? (
            <SocialLinks
              links={links}
              onUnverifiedClick={onUnverifiedLink}
              stopPropagation
              className="flex flex-wrap content-start gap-2 md:mt-1"
            />
          ) : (
            <span className="text-xs text-gray-500">-</span>
          )}
        </div>
      </div>
    </div>
  );
}
