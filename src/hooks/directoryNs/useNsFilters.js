import { useMemo, useState } from "react";

import {
  getCountryFlag,
  getCountryName,
  getProfileLocation,
  getProfileTags,
  hasRank,
  isNsProfile,
  isTruthyFlag,
  isVerifiedProfile,
} from "../../utils/directoryNsUtils";

export default function useNsFilters(profiles) {
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState([]);
  const [tagFilter, setTagFilter] = useState("all");
  const [locationSearch, setLocationSearch] = useState("");
  const [tagSearch, setTagSearch] = useState("");
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
  const isFiltering = anyFilterActive || search.trim().length > 0 || locationFilter.length > 0;

  return {
    search,
    setSearch,
    filters,
    toggleFilter,
    clearFilters,
    anyFilterActive,
    locationFilter,
    setLocationFilter,
    tagFilter,
    setTagFilter,
    locationSearch,
    setLocationSearch,
    tagSearch,
    setTagSearch,
    locationOptions,
    tagOptions,
    filteredLocationOptions,
    filteredTagOptions,
    filteredProfiles,
    filteredCount,
    isFiltering,
  };
}
