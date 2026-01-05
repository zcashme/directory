import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import AddUserForm from "./AddUserForm";
import { useFeedback } from "./hooks/useFeedback";
import useFeedbackController from "./hooks/useFeedbackController";
import ProfileAvatar from "./components/ProfileAvatar";
import CopyButton from "./components/CopyButton";
import AmountAndWallet from "./components/AmountAndWallet";
import QrUriBlock from "./components/QrUriBlock";
import HelpMessage from "./components/HelpMessage";
import LoadingDots from "./components/LoadingDots";
import znsFlag from "./assets/favicons/zns-flag.png";
import znsFavicon from "./assets/favicons/zns-favicon.png";
import discordFavicon from "./assets/favicons/favicon-discord-32.png";
import longTermIcon from "./assets/favicons/network-state-plus-flag-avatar-logo-long-term.png";
import coreIcon from "./assets/favicons/network-state-plus-flag-avatar-logo-core-team.png";
import allIcon from "./assets/favicons/network-state-plus-flag-avatar-logo-black.png";
import { extractDomain } from "./utils/domainParsing";
import { KNOWN_DOMAINS, FALLBACK_ICON } from "./utils/domainLabels";
import useProfiles from "./hooks/useProfiles";
import { supabase } from "./supabase";

const normalizeSlug = (value = "") =>
  value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");

const isTruthyFlag = (value) =>
  value === true || value === "true" || value === 1 || value === "1";

const isNsProfile = (profile) => isTruthyFlag(profile?.is_ns);

const hasRank = (profile) =>
  ["alltime", "weekly", "monthly", "daily"].some(
    (period) => Number(profile?.[`rank_${period}`]) > 0
  );

const isVerifiedProfile = (profile) =>
  Boolean(profile?.address_verified) ||
  Number(profile?.verified_links_count || 0) > 0 ||
  Boolean(profile?.links?.some((link) => link.is_verified));

const getLinkIcon = (url = "") => {
  const domain = extractDomain(url || "");
  const entry = KNOWN_DOMAINS[domain];
  return entry?.icon || FALLBACK_ICON;
};

const getLinkLabel = (url = "") => {
  const domain = extractDomain(url || "");
  const entry = KNOWN_DOMAINS[domain];
  return entry?.label || domain || "Link";
};

const getSocialHandle = (url = "") => {
  const cleaned = url.split("#")[0].split("?")[0].replace(/\/+$/, "");
  const parts = cleaned.split("/");
  const last = parts[parts.length - 1] || "";
  return decodeURIComponent(last);
};

const getLastVerifiedLabel = (profile) => {
  const ts = profile?.last_verified_at || profile?.last_verified;
  if (!ts) return "n/a";
  const ms = new Date(ts).getTime();
  if (Number.isNaN(ms)) return "n/a";
  const weeks = (Date.now() - ms) / (1000 * 60 * 60 * 24 * 7);
  if (weeks < 1) return "<1 week ago";
  if (weeks < 2) return "<2 weeks ago";
  if (weeks < 3) return "<3 weeks ago";
  if (weeks < 4) return "<4 weeks ago";
  return "<1 month ago";
};

const getProfileLocation = (profile) => profile?.nearest_city_name || "";

const getCountryFlag = (country = "") => {
  const code = country.trim().toUpperCase();
  if (code.length !== 2) return "";
  const base = 0x1f1e6;
  const chars = code.split("");
  if (chars.some((ch) => ch < "A" || ch > "Z")) return "";
  return String.fromCodePoint(
    base + (chars[0].charCodeAt(0) - 65),
    base + (chars[1].charCodeAt(0) - 65)
  );
};

const getCountryName = (profile) => (profile?.country || "").trim();

const getProfileTags = (profile) => {
  const tags = [];
  if (isVerifiedProfile(profile)) tags.push("Verified");
  if (hasRank(profile)) tags.push("Top Rank");
  if (isTruthyFlag(profile?.is_ns_core)) tags.push("Core");
  if (isTruthyFlag(profile?.is_ns_longterm)) tags.push("Long-term");
  return tags;
};

const filterBaseClass =
  "inline-flex items-center border border-gray-900 px-3 py-2 text-xs font-semibold uppercase rounded-none transition-transform duration-150";

const filterContentClass = "flex items-center gap-2";

const getFilterButtonClass = (active, activeClass, hoverClass) => {
  const scopedHoverClass = hoverClass.replace(/hover:/g, "md:hover:");
  return `${filterBaseClass} md:hover:scale-[1.03] ${active ? activeClass : "bg-white"
    } ${scopedHoverClass}`;
};

const getTagLabel = (tag) => (tag.startsWith("NS v") ? "NS v" : tag);

export default function DirectoryAlt() {
  const navigate = useNavigate();
  const { setSelectedAddress, setForceShowQR, forceShowQR } = useFeedback();
  const { memo, amount, setDraftMemo, setDraftAmount, selectedAddress, uri } =
    useFeedbackController();
  const { profiles, loading, addProfile } = useProfiles();

  const announcementConfig = {
    enabled: true,
    message: "Zcash Office Hours",
    actionLabel: "Action",
    dismissLabel: "Dismiss",
  };

  const [search, setSearch] = useState("");
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [locationFilter, setLocationFilter] = useState([]);
  const [tagFilter, setTagFilter] = useState("all");
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeProfile, setActiveProfile] = useState(null);
  const [shareStatus, setShareStatus] = useState("");
  const [isCardView, setIsCardView] = useState(false);
  const locationButtonRef = useRef(null);
  const locationDropdownRef = useRef(null);
  const tagButtonRef = useRef(null);
  const tagDropdownRef = useRef(null);
  const activeTags = useMemo(
    () => (activeProfile ? getProfileTags(activeProfile) : []),
    [activeProfile]
  );

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "ZNS";
    let faviconLink = document.querySelector("link[rel~='icon']");
    const previousHref = faviconLink?.getAttribute("href") || "";
    if (!faviconLink) {
      faviconLink = document.createElement("link");
      faviconLink.rel = "icon";
      document.head.appendChild(faviconLink);
    }
    faviconLink.href = znsFavicon;
    return () => {
      document.title = previousTitle;
      if (faviconLink && previousHref) {
        faviconLink.href = previousHref;
      }
    };
  }, []);

  const [filters, setFilters] = useState({
    verified: false,
    ranked: false,
    core: false,
    longterm: false,
  });

  const toggleFilter = (key) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (key === "verified") {
        next.verified = !prev.verified;
        return next;
      }
      if (key === "core") {
        const nextValue = !prev.core;
        next.core = nextValue;
        if (nextValue) next.longterm = false;
        return next;
      }
      if (key === "longterm") {
        const nextValue = !prev.longterm;
        next.longterm = nextValue;
        if (nextValue) next.core = false;
        return next;
      }
      if (key === "ranked") {
        next.ranked = !prev.ranked;
        return next;
      }
      return next;
    });
  };

  const clearFilters = () => {
    setFilters({ verified: false, ranked: false, core: false, longterm: false });
  };

  const anyFilterActive = Object.values(filters).some(Boolean);

  const locationOptions = useMemo(() => {
    const map = new Map();
    profiles
      .filter((profile) => isNsProfile(profile))
      .forEach((profile) => {
        const city = getProfileLocation(profile);
        if (!city) return;
        const countryName = getCountryName(profile) || "Unknown";
        const countryCode =
          profile?.iso2 ||
          (typeof profile?.country === "string" && profile.country.trim().length === 2
            ? profile.country
            : "");
        const key = countryName;
        if (!map.has(key)) {
          map.set(key, {
            country: countryName,
            flag: getCountryFlag(countryCode || ""),
            cities: new Set(),
          });
        }
        map.get(key).cities.add(city);
      });

    return Array.from(map.values())
      .map((entry) => ({
        ...entry,
        cities: Array.from(entry.cities).sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: "base" })
        ),
      }))
      .sort((a, b) => a.country.localeCompare(b.country, undefined, { sensitivity: "base" }));
  }, [profiles]);

  const tagOptions = useMemo(() => {
    const values = new Set();
    profiles.filter((profile) => isNsProfile(profile)).forEach((profile) => {
      getProfileTags(profile).forEach((tag) => values.add(tag));
    });
    return Array.from(values).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [profiles]);

  const filteredLocationOptions = useMemo(() => {
    const query = locationSearch.trim().toLowerCase();
    if (!query) return locationOptions;
    return locationOptions
      .map((entry) => ({
        ...entry,
        cities: entry.cities.filter((city) => city.toLowerCase().includes(query)),
      }))
      .filter((entry) => entry.cities.length > 0);
  }, [locationOptions, locationSearch]);

  const filteredTagOptions = useMemo(() => {
    const query = tagSearch.trim().toLowerCase();
    if (!query) return tagOptions;
    return tagOptions.filter((option) => option.toLowerCase().includes(query));
  }, [tagOptions, tagSearch]);

  const filteredProfiles = useMemo(() => {
    const list = profiles.filter((profile) => isNsProfile(profile));
    const query = search.trim().toLowerCase();

    let filtered = list;

    if (query) {
      filtered = filtered
        .map((profile, index) => {
          const name = (profile?.name || "").toLowerCase();
          const displayName = (profile?.display_name || "").toLowerCase();
          const bio = (profile?.bio || "").toLowerCase();
          const location = (profile?.nearest_city_name || "").toLowerCase();
          const links = (profile?.link_search_text || "").toLowerCase();
          const displayMatch = displayName.includes(query);
          const nameMatch = name.includes(query);
          const linkMatch = links.includes(query);
          const matches =
            displayMatch ||
            nameMatch ||
            linkMatch ||
            bio.includes(query) ||
            location.includes(query);

          let score = 99;
          if (displayMatch) score = 0;
          else if (nameMatch) score = 1;
          else if (linkMatch) score = 2;

          return { profile, score, matches, index };
        })
        .filter((entry) => entry.matches)
        .sort((a, b) => {
          if (a.score !== b.score) return a.score - b.score;
          return a.index - b.index;
        })
        .map((entry) => entry.profile);
    }

    if (filters.verified) {
      filtered = filtered.filter((profile) => isVerifiedProfile(profile));
    }

    if (filters.ranked) {
      filtered = filtered.filter((profile) => hasRank(profile));
    }

    if (filters.core) {
      filtered = filtered.filter((profile) => isTruthyFlag(profile?.is_ns_core));
    }

    if (filters.longterm) {
      filtered = filtered.filter((profile) => isTruthyFlag(profile?.is_ns_longterm));
    }

    if (locationFilter.length) {
      const selected = new Set(locationFilter);
      filtered = filtered.filter((profile) => {
        const city = getProfileLocation(profile);
        if (!city) return false;
        const countryName = getCountryName(profile) || "Unknown";
        const key = `${countryName}|||${city}`;
        return selected.has(key);
      });
    }

    if (tagFilter !== "all") {
      filtered = filtered.filter((profile) => getProfileTags(profile).includes(tagFilter));
    }

    if (!query) {
      filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return filtered;
  }, [profiles, search, filters, locationFilter, tagFilter]);
  const filteredCount = filteredProfiles.length;
  const isFiltering =
    anyFilterActive || search.trim().length > 0 || locationFilter.length > 0;

  const nsCount = profiles.filter((profile) => isNsProfile(profile)).length;

  const verifiedCount = useMemo(
    () => profiles.filter((profile) => isNsProfile(profile) && isVerifiedProfile(profile)).length,
    [profiles]
  );
  const rankedCount = useMemo(
    () => profiles.filter((profile) => isNsProfile(profile) && hasRank(profile)).length,
    [profiles]
  );
  const coreCount = useMemo(
    () => profiles.filter((profile) => isNsProfile(profile) && isTruthyFlag(profile?.is_ns_core)).length,
    [profiles]
  );
  const longtermCount = useMemo(
    () => profiles.filter((profile) => isNsProfile(profile) && isTruthyFlag(profile?.is_ns_longterm)).length,
    [profiles]
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(event.target) &&
        locationButtonRef.current &&
        !locationButtonRef.current.contains(event.target)
      ) {
        setShowLocationFilter(false);
      }

      if (
        tagDropdownRef.current &&
        !tagDropdownRef.current.contains(event.target) &&
        tagButtonRef.current &&
        !tagButtonRef.current.contains(event.target)
      ) {
        setShowTagFilter(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsCardView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 240);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setShareStatus("");
  }, [activeProfile]);

  const [linksByProfileId, setLinksByProfileId] = useState({});

  useEffect(() => {
    let isActive = true;
    const ids = profiles.filter((profile) => isNsProfile(profile)).map((profile) => profile.id);
    const idsWithValue = ids.filter((id) => typeof id === "number" || typeof id === "string");
    if (!idsWithValue.length) {
      setLinksByProfileId({});
      return undefined;
    }

    const fetchLinks = async () => {
      const { data, error } = await supabase
        .from("zcasher_links")
        .select("id,label,url,is_verified,zcasher_id")
        .in("zcasher_id", idsWithValue);

      if (error || !isActive) return;
      const map = {};
      (data || []).forEach((link) => {
        const icon = getLinkIcon(link.url);
        const label = getLinkLabel(link.url);
        const entry = { ...link, icon, label };
        map[link.zcasher_id] = map[link.zcasher_id] || [];
        map[link.zcasher_id].push(entry);
      });
      setLinksByProfileId(map);
    };

    fetchLinks();
    return () => {
      isActive = false;
    };
  }, [profiles]);

  const [flightPaths, setFlightPaths] = useState([]);
  const flightTimersRef = useRef([]);

  useEffect(() => {
    const buildPath = () => {
      const randPoint = () => ({
        x: 20 + Math.random() * 160,
        y: 15 + Math.random() * 90,
      });
      let start = randPoint();
      let end = randPoint();
      let tries = 0;
      while (tries < 10) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 40 && dist < 140) break;
        start = randPoint();
        end = randPoint();
        tries += 1;
      }
      if (Math.random() < 0.5) {
        const temp = start;
        start = end;
        end = temp;
      }
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const bend = (Math.random() - 0.5) * 60;
      const lift = (Math.random() - 0.5) * 60;
      const ctrl1X = midX + bend;
      const ctrl1Y = midY + lift;
      const ctrl2X = midX - bend;
      const ctrl2Y = midY - lift;
      return `M${start.x} ${start.y} C${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${end.x} ${end.y}`;
    };

    const buildPathEntry = (id) => {
      const duration = 4 + Math.random() * 4;
      const delay = Math.random() * 1.5;
      return {
        id,
        d: buildPath(),
        duration,
        delay,
        dashRatio: 0.12 + Math.random() * 0.12,
      };
    };

    const replacePath = (id) => {
      const nextEntry = buildPathEntry(id);
      setFlightPaths((prev) =>
        prev.map((path) => (path.id === id ? nextEntry : path))
      );
      const gap = 400 + Math.random() * 1400;
      const timeoutId = setTimeout(
        () => replacePath(id),
        (nextEntry.duration + nextEntry.delay) * 1000 + gap
      );
      flightTimersRef.current[id] = timeoutId;
    };

    const initial = Array.from({ length: 3 }, (_, idx) => buildPathEntry(idx));
    setFlightPaths(initial);
    initial.forEach((path) => {
      const gap = 800 + Math.random() * 1600;
      const timeoutId = setTimeout(
        () => replacePath(path.id),
        (path.duration + path.delay) * 1000 + gap
      );
      flightTimersRef.current[path.id] = timeoutId;
    });

    return () => {
      flightTimersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const buildSlug = (profile) => {
    const base = normalizeSlug(profile?.name || "");
    if (!base) return "";
    if (profile?.slug) return profile.slug;
    if (profile?.address_verified) return base;
    return `${base}-${profile?.id}`;
  };

  const handleRowClick = useCallback((profile) => {
    if (!profile?.address) return;
    window.lastSelectionWasExplicit = true;
    setSelectedAddress(profile.address);
    window.dispatchEvent(
      new CustomEvent("selectAddress", { detail: { address: profile.address } })
    );
    const slug = buildSlug(profile);
    if (slug) navigate(`/${slug}`);
  }, [navigate, setSelectedAddress]);

  const showAnnouncement = announcementConfig.enabled && !isBannerDismissed;

  const getAddressDisplay = (profile) => {
    const address = profile?.address;
    if (!address) return "-";
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const InlineCopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);

    return (
      <button
        type="button"
        onClick={() => {
          if (!text) return;
          navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        title={copied ? "Copied" : "Copy"}
        className={`flex items-center gap-1 px-1 text-xs transition-colors ${copied ? "text-green-600" : "text-gray-500 hover:text-blue-600"
          }`}
      >
        {copied ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              d="M5 12l4 4 10-10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              d="M9 9h10v10H9z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M5 5h10v10H5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        )}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
    );
  };

  const profileRows = useMemo(
    () =>
      filteredProfiles.map((profile) => {
        const location = getProfileLocation(profile) || "-";
        const countryCode =
          profile?.iso2 ||
          (typeof profile?.country === "string" && profile.country.trim().length === 2
            ? profile.country
            : "");
        const countryFlag = getCountryFlag(countryCode || "");
        const countryName = getCountryName(profile);
        const tags = getProfileTags(profile);
        const links = linksByProfileId[profile?.id] || [];
        const lastVerified = getLastVerifiedLabel(profile);
        const addressValue = profile?.address || "";
        const addressDisplay = getAddressDisplay(profile);
        const canShowAddressBar = addressDisplay !== "-";
        const bioText =
          profile?.bio?.trim() ||
          profile?.tagline?.trim() ||
          "";

        return (
          <div
            key={profile?.id ?? profile?.address}
            className="w-full text-left transition-transform duration-150 hover:scale-[1.01]"
            onClick={(event) => {
              const interactive = event.target.closest(
                "a,button,input,textarea,label,svg"
              );
              if (interactive) return;
              if (!profile?.address) return;
              setSelectedAddress(profile.address);
              if (selectedAddress !== profile.address) {
                setDraftMemo("");
              }
              setActiveProfile(profile);
            }}
          >
            <div className="mt-3 grid items-center md:items-start gap-3 border border-gray-900 bg-white px-4 py-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.8fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.4fr)] rounded-none">
              <div className="flex min-w-0 items-center gap-3 overflow-hidden md:col-start-1 md:row-start-1">
                <ProfileAvatar
                  profile={profile}
                  size={36}
                  imageClassName="object-contain"
                  className="shadow-sm"
                  showFallbackIcon
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-nowrap">
                    <div className="min-w-0 text-base font-black tracking-tight text-gray-900">
                      {profile?.display_name || profile?.name || "Unnamed"}
                    </div>
                    {tags.length ? (
                      <div className="flex items-center gap-1 shrink-0">
                        {tags.map((tag) => (
                          <span key={`${profile?.id}-${tag}`} title={tag} className="flex items-center">
                            {tag === "Verified" && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="48 36 160 200"
                                className="h-4 w-3 block"
                                aria-hidden="true"
                              >
                                <path
                                  d="M56 70 C86 78, 108 74, 128 52 C148 74, 170 78, 200 70 V128 C200 172, 164 206, 128 224 C92 206, 56 172, 56 128 Z"
                                  fill="#2f7d4c"
                                />
                                <path
                                  d="M96 126 L118 148 L162 104"
                                  fill="none"
                                  stroke="#ffffff"
                                  strokeWidth="18"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                            {tag === "Top Rank" && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 256 256"
                                className="h-4 w-4 block"
                                aria-hidden="true"
                              >
                                <path
                                  d="M128 28 L156 92 L224 100 L172 146 L186 216 L128 180 L70 216 L84 146 L32 100 L100 92 Z"
                                  fill="#000000"
                                />
                              </svg>
                            )}
                            {tag === "Core" && (
                              <img src={coreIcon} alt="Core" className="h-4 w-auto" />
                            )}
                            {tag === "Long-term" && (
                              <img src={longTermIcon} alt="Long Term" className="h-4 w-auto" />
                            )}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    <a
                      href={`https://zcash.me/${normalizeSlug(profile?.name || profile?.display_name || "")}`}
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
                    <span title={addressValue || addressDisplay}>
                      {addressDisplay}
                    </span>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!addressValue) return;
                          setSelectedAddress(addressValue);
                          if (selectedAddress !== addressValue) {
                            setDraftMemo("");
                          }
                          setActiveProfile(profile);
                          setForceShowQR(Date.now());
                        }}
                        className={`flex items-center gap-1 px-1 text-xs transition-colors ${addressValue
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
                  <div className="flex flex-wrap content-start gap-2 md:mt-1">
                    {links.map((link) => (
                      <a
                        key={link.id || link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="flex h-7 items-center gap-2 border border-gray-900 bg-white px-2 text-[10px] font-semibold uppercase transition-transform duration-150 hover:scale-[1.05] rounded-none"
                        title={getLinkLabel(link.url)}
                      >
                        <img
                          src={link.icon}
                          alt={link.label || ""}
                          className="h-4 w-4"
                        />
                        <span className="max-w-[120px] truncate">
                          {getSocialHandle(link.url)}
                        </span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">-</span>
                )}
              </div>
            </div>
          </div>
        );
      }),
    [
      filteredProfiles,
      linksByProfileId,
      isCardView,
      selectedAddress,
      handleRowClick,
      setDraftMemo,
      setSelectedAddress,
      setForceShowQR,
      filterBaseClass,
      filterContentClass,
    ]
  );

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-gray-900 overflow-x-hidden">
      {showAnnouncement && (
        <div className="fixed left-0 right-0 top-0 z-40 border-b border-gray-300 bg-[#f6b223] backdrop-blur">
          <div className="mx-auto w-full max-w-6xl px-5">
            <div className="h-10">
              <div className="flex h-full flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide">
                <span>{announcementConfig.message}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.alert("Coming Soon")}
                    className="border border-gray-900 bg-white px-3 py-1 text-[10px] font-semibold transition-transform duration-150 hover:scale-[1.04] rounded-none"
                  >
                    {announcementConfig.actionLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBannerDismissed(true)}
                    className="border border-gray-900 bg-gray-900 px-3 py-1 text-[10px] font-semibold text-white transition-transform duration-150 hover:scale-[1.04] rounded-none"
                  >
                    {announcementConfig.dismissLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={`fixed left-0 right-0 z-30 border-b border-gray-300 bg-[#f7f7f2]/80 backdrop-blur ${showAnnouncement ? "top-10" : "top-0"
          }`}
      >
        <div className="mx-auto w-full max-w-6xl px-5">
          <div className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide sm:flex-nowrap">
              <div className="flex items-center gap-2">
                <img
                  src={znsFlag}
                  alt="ZNS flag"
                  className="h-5 w-auto"
                />
                <span className="text-base font-black">zcash.me/ns</span>
              </div>
              <div className="hidden w-full max-w-lg flex-1 items-center gap-2 md:flex">
                <label className="sr-only" htmlFor="directory-search">
                  Search profiles
                </label>
                <input
                  id="directory-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search names, links, or locations"
                  className="h-9 w-full border border-gray-900 bg-white px-3 text-sm focus:outline-none transition-transform duration-150 hover:scale-[1.01] rounded-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsJoinOpen(true)}
                  className="border border-gray-900 bg-gray-900 px-3 py-1 text-[10px] font-semibold text-white transition-transform duration-150 hover:scale-[1.04] rounded-none"
                >
                  Add your name
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`mx-auto w-full max-w-6xl px-5 pb-16 pt-6 ${showAnnouncement ? "pt-32 sm:pt-36" : "pt-20 sm:pt-24"
          }`}
      >
        <div className="mt-6 relative">
          <div className="pointer-events-none absolute left-1/2 -top-16 z-0 h-36 w-36 -translate-x-1/2 opacity-70">
            <svg
              viewBox="0 0 200 200"
              className="h-full w-full"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="globeFade" cx="50%" cy="45%" r="55%">
                  <stop offset="0%" stopColor="#f2f2f2" />
                  <stop offset="100%" stopColor="#d9d9d9" />
                </radialGradient>
                <linearGradient id="globeMask" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="55%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                <mask id="fadeMask">
                  <rect x="0" y="0" width="200" height="200" fill="url(#globeMask)" />
                </mask>
              </defs>
              <g mask="url(#fadeMask)">
                <circle cx="100" cy="100" r="90" fill="url(#globeFade)" stroke="#cfcfcf" strokeWidth="2" />
                <path d="M20 100 C60 80, 140 80, 180 100" fill="none" stroke="#c7c7c7" strokeWidth="1" />
                <path d="M20 100 C60 120, 140 120, 180 100" fill="none" stroke="#c7c7c7" strokeWidth="1" />
                <path d="M100 10 C120 60, 120 140, 100 190" fill="none" stroke="#c7c7c7" strokeWidth="1" />
                <path d="M100 10 C80 60, 80 140, 100 190" fill="none" stroke="#c7c7c7" strokeWidth="1" />
                {flightPaths.map((path) => (
                  <path
                    key={`${path.id}-${path.d}`}
                    d={path.d}
                    fill="none"
                    stroke="#bdbdbd"
                    strokeWidth="2"
                    pathLength="1"
                    strokeDasharray={`${path.dashRatio} 1`}
                    className="flight-path"
                    style={{
                      animationDuration: `${path.duration}s, ${path.duration}s`,
                      animationDelay: `${path.delay}s, ${path.delay}s`,
                    }}
                  />
                ))}
              </g>
            </svg>
          </div>
          <h1 className="relative z-10 text-3xl font-black uppercase tracking-tight sm:text-4xl">
            The peer-to-peer electronic cash of The Network School
          </h1>
          <div className="mt-4 md:hidden">
            <label className="sr-only" htmlFor="directory-search-card">
              Search profiles
            </label>
            <input
              id="directory-search-card"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search names, links, or locations"
              className="h-9 w-full border border-gray-900 bg-white px-3 text-sm focus:outline-none rounded-none"
            />
          </div>
          <p className="mt-2 max-w-2xl text-sm text-gray-700">
            This is a directory of Zcash users at{" "}
            <a
              href="https://ns.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2"
            >
              Network School
            </a>
            . Now features{" "}
            <span className="font-semibold">
              {isFiltering ? `${filteredCount} of ${nsCount}` : nsCount}
            </span>{" "}
            names.{" "}
            <button
              type="button"
              onClick={() => window.alert("Coming Soon. Not affiliated with ns.com (at least, not yet).")}
              className="font-semibold underline underline-offset-2"
            >
              Frequently Asked Questions
            </button>
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase">
            <button
              type="button"
              onClick={clearFilters}
              className={getFilterButtonClass(!anyFilterActive, "bg-blue-300", "hover:bg-blue-200")}
            >
              <span className={filterContentClass}>
                <img src={allIcon} alt="All" className="h-4 w-auto" />
                All ({nsCount})
              </span>
            </button>
            <button
              type="button"
              onClick={() => toggleFilter("verified")}
              className={getFilterButtonClass(filters.verified, "bg-green-300", "hover:bg-green-200")}
            >
              <span className={filterContentClass}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="48 36 160 200"
                  className="h-5 w-4"
                  aria-hidden="true"
                >
                  <path
                    d="M56 70 C86 78, 108 74, 128 52 C148 74, 170 78, 200 70 V128 C200 172, 164 206, 128 224 C92 206, 56 172, 56 128 Z"
                    fill="#2f7d4c"
                  />
                  <path
                    d="M96 126 L118 148 L162 104"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Verified ({verifiedCount})
              </span>
            </button>
            <button
              type="button"
              onClick={() => toggleFilter("core")}
              className={getFilterButtonClass(filters.core, "bg-[#f6b223]", "hover:bg-[#f6b223]")}
            >
              <span className={filterContentClass}>
                <img src={coreIcon} alt="Core" className="h-4 w-auto" />
                Core ({coreCount})
              </span>
            </button>
            <button
              type="button"
              onClick={() => toggleFilter("longterm")}
              className={getFilterButtonClass(filters.longterm, "bg-[#16b364]", "hover:bg-[#16b364]")}
            >
              <span className={filterContentClass}>
                <img src={longTermIcon} alt="Long-Term" className="h-4 w-auto" />
                Long-Term ({longtermCount})
              </span>
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleFilter("ranked")}
                className={getFilterButtonClass(filters.ranked, "bg-orange-300", "hover:bg-orange-200")}
              >
                <span className={filterContentClass}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 256 256"
                    className="h-5 w-auto"
                    aria-hidden="true"
                  >
                    <path
                      d="M128 28 L156 92 L224 100 L172 146 L186 216 L128 180 L70 216 L84 146 L32 100 L100 92 Z"
                      fill="#000000"
                    />
                  </svg>
                  Top Rank ({rankedCount})
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLocationFilter(true);
                  setLocationSearch("");
                }}
                className={getFilterButtonClass(false, "bg-white", "hover:bg-orange-200")}
              >
                <span className={filterContentClass}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 5h18l-7 8v5l-4 2v-7L3 5z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Location
                </span>
              </button>
            </div>
          </div>
          <a
            href="https://discord.com/channels/900827411917201418/1454104981320892591"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-gray-900 px-3 py-2 text-xs font-semibold uppercase transition-transform duration-150 hover:scale-[1.03] rounded-none sm:ml-auto"
          >
            <span className="flex w-full items-center justify-center gap-2 text-center">
              <img src={discordFavicon} alt="Discord" className="h-4 w-auto" />
              Join the Discord
            </span>
          </a>
        </div>

        <div className="mt-6">
          <div>
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.8fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.4fr)] items-center gap-4 border border-gray-900 bg-white px-4 py-3 text-xs font-semibold tracking-wide transition-transform duration-150 hover:scale-[1.01] md:grid rounded-none">
              <div className="flex items-center">Name</div>
              <div className="flex items-center">Address</div>
              <div className="flex items-center">Last Verified</div>
              <div className="flex items-center">Nearest City</div>
              <div className="flex items-center">Social</div>
            </div>

            {loading && (
              <LoadingDots
                colors={["#000000", "#000000", "#000000", "#000000"]}
                className="py-10"
              />
            )}

            {!loading && filteredProfiles.length === 0 && (
              <div className="px-4 py-6 text-sm text-gray-600">No profiles found.</div>
            )}

            {!loading && profileRows}
          </div>
        </div>

        {showLocationFilter && (
          <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center">
            <button
              type="button"
              className="absolute inset-0"
              onClick={() => setShowLocationFilter(false)}
              aria-label="Close"
            />
            <div className="relative w-full max-w-3xl rounded-t-xl border border-gray-900 bg-white md:rounded-none">
              <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-gray-500"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M20 20l-3-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  value={locationSearch}
                  onChange={(event) => setLocationSearch(event.target.value)}
                  placeholder="Location"
                  className="w-full text-sm focus:outline-none"
                />
              </div>
              <div className="max-h-[50vh] overflow-y-auto px-4 py-2">
                <button
                  type="button"
                  onClick={() => {
                    setLocationFilter([]);
                    setShowLocationFilter(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm ${locationFilter.length === 0 ? "bg-gray-100" : "hover:bg-gray-50"
                    }`}
                >
                  <span className="h-4 w-4 rounded-full border border-gray-500" />
                  All locations
                </button>
                {filteredLocationOptions.map((group) => (
                  <div key={group.country} className="mt-3">
                    <div className="text-xs font-semibold uppercase text-gray-500">
                      {group.flag ? `${group.flag} ` : ""}{group.country}
                    </div>
                    <div className="mt-2 flex flex-col gap-1">
                      {group.cities.map((city) => {
                        const key = `${group.country}|||${city}`;
                        const isSelected = locationFilter.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setLocationFilter((prev) => {
                                if (prev.includes(key)) {
                                  return prev.filter((item) => item !== key);
                                }
                                return [...prev, key];
                              });
                            }}
                            className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm ${isSelected ? "bg-gray-100" : "hover:bg-gray-50"
                              }`}
                          >
                            <span className="h-4 w-4 rounded-full border border-gray-500" />
                            {city}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setShowLocationFilter(false)}
                  className="w-full rounded-md border border-gray-900 bg-gray-900 py-2 text-sm font-semibold uppercase text-white"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {activeProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <button
              type="button"
              className="absolute inset-0"
              onClick={() => {
                setActiveProfile(null);
              }}
              aria-label="Close"
            />
            <div className="relative w-full max-w-2xl border border-gray-900 bg-white px-4 py-4 rounded-none directoryns-popup">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                  <ProfileAvatar
                    profile={activeProfile}
                    size={36}
                    imageClassName="object-contain"
                    className="shadow-sm"
                    showFallbackIcon
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-nowrap">
                      <div className="min-w-0 text-base font-black tracking-tight text-gray-900">
                        {activeProfile?.display_name || activeProfile?.name || "Unnamed"}
                      </div>
                      {activeTags.length ? (
                        <div className="flex items-center gap-1 shrink-0">
                          {activeTags.map((tag) => (
                            <span key={`active-${tag}`} title={tag} className="flex items-center">
                              {tag === "Verified" && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="48 36 160 200"
                                  className="h-4 w-3 block"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="M56 70 C86 78, 108 74, 128 52 C148 74, 170 78, 200 70 V128 C200 172, 164 206, 128 224 C92 206, 56 172, 56 128 Z"
                                    fill="#2f7d4c"
                                  />
                                  <path
                                    d="M96 126 L118 148 L162 104"
                                    fill="none"
                                    stroke="#ffffff"
                                    strokeWidth="18"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                              {tag === "Top Rank" && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 256 256"
                                  className="h-4 w-4 block"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="M128 28 L156 92 L224 100 L172 146 L186 216 L128 180 L70 216 L84 146 L32 100 L100 92 Z"
                                    fill="#000000"
                                  />
                                </svg>
                              )}
                              {tag === "Core" && (
                                <img src={coreIcon} alt="Core" className="h-4 w-auto" />
                              )}
                              {tag === "Long-term" && (
                                <img src={longTermIcon} alt="Long Term" className="h-4 w-auto" />
                              )}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <a
                      href={`https://zcash.me/${normalizeSlug(activeProfile?.name || activeProfile?.display_name || "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-baseline gap-0 text-[10px] font-bold uppercase tracking-wide text-gray-500 hover:underline"
                    >
                      <span>Zcash.me/</span>
                      <span>{activeProfile?.name || activeProfile?.display_name || "Unnamed"}</span>
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const slug = normalizeSlug(
                        activeProfile?.name || activeProfile?.display_name || ""
                      );
                      if (!slug) return;
                      const shareUrl = `https://zcash.me/${slug}`;
                      if (navigator.share) {
                        navigator.share({
                          title: activeProfile?.display_name || activeProfile?.name || "Zcash.me",
                          url: shareUrl,
                        });
                        return;
                      }
                      navigator.clipboard.writeText(shareUrl);
                      setShareStatus("Copied");
                      setTimeout(() => setShareStatus(""), 1500);
                    }}
                    className="border border-gray-900 bg-white px-2 py-1 text-xs font-semibold uppercase text-gray-900 rounded-none"
                    disabled={
                      !normalizeSlug(
                        activeProfile?.name || activeProfile?.display_name || ""
                      )
                    }
                  >
                    {shareStatus || "Share"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProfile(null);
                    }}
                    className="border border-gray-900 bg-gray-900 px-2 py-1 text-xs font-semibold uppercase text-white rounded-none"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="mt-4 directoryns-fieldset">
                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  Address
                </div>
                {activeProfile?.address ? (
                  <div className="mt-1 flex h-7 max-w-full items-center gap-2 border border-gray-900 bg-gray-50 px-3 text-sm font-mono text-gray-700 rounded-none">
                    <span
                      className="min-w-0 flex-1 break-all"
                      title={activeProfile.address}
                    >
                      {activeProfile.address.length > 24
                        ? `${activeProfile.address.slice(0, 8)}…${activeProfile.address.slice(-8)}`
                        : activeProfile.address}
                    </span>
                    <InlineCopyButton text={activeProfile.address} />
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-gray-500">-</div>
                )}
              </div>

              <div className="mt-4 directoryns-fieldset">
                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  Write a message to {activeProfile.display_name || activeProfile.name || "recipient"}
                </div>
                <textarea
                  value={memo}
                  onChange={(event) => setDraftMemo(event.target.value)}
                  placeholder={`Write your message to ${activeProfile.display_name || activeProfile.name || "recipient"
                    } here...`}
                  className="mt-2 w-full border border-gray-900 bg-white px-3 py-2 text-sm resize-none focus:outline-none rounded-none"
                  rows={4}
                  onClick={(event) => event.stopPropagation()}
                />
              </div>

              <div className="mt-4 directoryns-amount directoryns-fieldset">
                <AmountAndWallet
                  amount={amount}
                  setAmount={setDraftAmount}
                  openWallet={() => {}}
                  showOpenWallet={false}
                  showUsdPill
                  showRateMessage
                />
              </div>

              <div className="directoryns-help directoryns-fieldset">
                <HelpMessage />
              </div>

              <div className="mt-4 directoryns-qr directoryns-fieldset">
                <QrUriBlock
                  uri={uri}
                  profileName={
                    activeProfile?.display_name || activeProfile?.name || "recipient"
                  }
                  forceShowQR={forceShowQR}
                  defaultShowQR={false}
                  defaultShowURI={false}
                />
              </div>
            </div>
          </div>
        )}

      </div>

      <AddUserForm
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onUserAdded={(newProfile) => {
          addProfile(newProfile);
          setIsJoinOpen(false);
        }}
      />
      {showBackToTop && !activeProfile && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 border border-gray-900 bg-gray-900 px-4 py-2 text-xs font-semibold uppercase text-white transition-transform duration-150 hover:scale-[1.04] active:scale-[0.98] rounded-none md:hidden"
        >
          Back to top
        </button>
      )}
      <style>{`
        @keyframes flightDash {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes flightFade {
          0% { opacity: 0; }
          20% { opacity: 0.9; }
          80% { opacity: 0.9; }
          100% { opacity: 0; }
        }
        .flight-path {
          animation-name: flightDash, flightFade;
          animation-timing-function: linear, ease-in-out;
          animation-iteration-count: infinite, infinite;
        }
        .directoryns-amount .rounded-xl {
          border-radius: 0 !important;
        }
        .directoryns-amount input,
        .directoryns-amount button,
        .directoryns-amount [class*="border-gray"] {
          border-color: #111 !important;
        }
        .directoryns-amount input,
        .directoryns-amount button {
          background-color: #fff !important;
          color: #111 !important;
        }
        .directoryns-amount [class*="text-gray"] {
          color: #111 !important;
        }
        .directoryns-qr .rounded-xl {
          border-radius: 0 !important;
        }
        .directoryns-qr button,
        .directoryns-qr a {
          color: #111 !important;
        }
        .directoryns-qr button,
        .directoryns-qr [class*="border-gray"] {
          border-color: #111 !important;
        }
        .directoryns-qr button {
          background-color: #fff !important;
        }
        .directoryns-qr [class*="text-gray"],
        .directoryns-qr [class*="text-blue"] {
          color: #111 !important;
        }
        .directoryns-fieldset,
        .directoryns-fieldset input,
        .directoryns-fieldset textarea,
        .directoryns-fieldset button,
        .directoryns-fieldset a,
        .directoryns-fieldset p {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace !important;
        }
        .directoryns-help [class*="text-gray"],
        .directoryns-help [class*="text-blue"] {
          color: #111 !important;
        }
      `}</style>
    </div>
  );
}
