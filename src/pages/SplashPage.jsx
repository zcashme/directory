"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import useProfiles from "../hooks/useProfiles";
import ProfileAvatar from "../components/ProfileAvatar";
import ZcashGridButton from "../components/ZcashGridButton";
import VerifiedBadge from "../components/VerifiedBadge";
import forestCityBg from "../assets/backgrounds/forestcity.png";

import zcashMeLogo from "../assets/icons/zcashme-header-left-bw.svg";


const FlippingBadge = ({ initialLabel, initialVerified, pool, className, delay = 0 }) => {
    const router = useRouter();
    const [isFront, setIsFront] = useState(true);
    const [frontData, setFrontData] = useState({ label: initialLabel || "zcash.me", verified: initialVerified });
    const [backData, setBackData] = useState({ label: "zcash.me", verified: false });
    const [sizerData, setSizerData] = useState({ label: initialLabel || "zcash.me", verified: initialVerified });
    const [isExpanded, setIsExpanded] = useState(false);

    // Expand when initial label changes from "zcash.me" to something with a name
    useEffect(() => {
        if (initialLabel && initialLabel.includes("/")) {
            // Data has loaded with a full label like "zcash.me/{name}"
            setFrontData({ label: initialLabel, verified: initialVerified });
            setSizerData({ label: initialLabel, verified: initialVerified });
            // Trigger expansion after a short delay to show the animation
            const timer = setTimeout(() => setIsExpanded(true), 50);
            return () => clearTimeout(timer);
        }
    }, [initialLabel, initialVerified]);

    const poolRef = useRef(pool);
    useEffect(() => {
        poolRef.current = pool;
    }, [pool]);

    const isFlippingRef = useRef(false);

    const randomFromPool = () => {
        const p = poolRef.current || [];
        if (p.length === 0) return null;
        return p[Math.floor(Math.random() * p.length)];
    };

    useEffect(() => {
        const r = randomFromPool();
        if (r) {
            setBackData({ label: `zcash.me/${r.name}`, verified: r.address_verified || r.verified });
            // If initial label isn't loaded yet, don't auto-expand back face
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            isFlippingRef.current = true;
            setIsFront(prev => !prev);
        }, 6000 + Math.random() * 4000 + delay);

        return () => clearInterval(interval);
    }, [delay]);

    // Synchronize sizer width with the 50% rotation mark (minimal pixels seen)
    useEffect(() => {
        if (!isFlippingRef.current) return;

        const timer = setTimeout(() => {
            // Update the sizer to the data of the face rotating INTO view
            setSizerData(isFront ? frontData : backData);
        }, 500); // 500ms is the midpoint of the 1000ms transition

        return () => clearTimeout(timer);
    }, [isFront, frontData, backData]);

    const sizerName = sizerData.label.split("/")[1] || "";
    const prefix = sizerData.label.split("/")[0] + "/";
    const name = (isFront ? frontData : backData).label.split("/")[1] || "";

    return (
        <div
            className={`absolute perspective-1000 animate-float transition-all duration-700 ${className}`}
        >
            <div
                onClick={() => router.push("/" + name)}
                className={`relative transition-transform duration-1000 transform-style-3d cursor-pointer hover:scale-105 ${isFront ? "" : "rotate-x-180"
                    }`}
                onTransitionEnd={(e) => {
                    if (e.propertyName !== "transform") return;
                    if (!isFlippingRef.current) return;

                    isFlippingRef.current = false;
                    const r = randomFromPool();
                    if (!r) return;

                    const nextData = { label: `zcash.me/${r.name}`, verified: r.address_verified || r.verified };
                    if (isFront) {
                        setBackData(nextData);
                    } else {
                        setFrontData(nextData);
                    }
                }}
            >
                {/* Sizer (invisible, provides dimensions) */}
                <div className="invisible px-3 py-1.5 flex items-center gap-1 text-sm font-medium whitespace-nowrap">
                    <span>{prefix}</span>
                    <span className={`transition-all duration-700 ease-out overflow-hidden ${isExpanded ? "max-w-[200px]" : "max-w-0"}`}>
                        {sizerName}
                    </span>
                    {sizerData.verified && <VerifiedBadge verified={true} className="shrink-0" />}
                </div>

                {/* Front Face */}
                <div className={`absolute inset-0 backface-hidden px-3 py-1.5 flex items-center gap-1 backdrop-blur-sm border rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)] text-sm font-medium transition-all duration-700 ${frontData.verified ? "bg-green-50/90 border-green-400 text-gray-800" : "bg-white/80 border-orange-100 text-gray-600"
                    }`}>
                    <span className="flex items-center">
                        <span className="whitespace-nowrap">{frontData.label.split("/")[0]}/</span>
                        <span className={`transition-all duration-700 ease-out overflow-hidden whitespace-nowrap ${isExpanded ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0"}`}>
                            {frontData.label.split("/")[1] || ""}
                        </span>
                    </span>
                    {frontData.verified && <VerifiedBadge verified={true} className="shrink-0" />}
                </div>

                {/* Back Face */}
                <div className={`absolute inset-0 backface-hidden rotate-x-180 px-3 py-1.5 flex items-center gap-1 backdrop-blur-sm border rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)] text-sm font-medium transition-all duration-700 ${backData.verified ? "bg-green-50/90 border-green-400 text-gray-800" : "bg-white/80 border-orange-100 text-gray-600"
                    }`}>
                    <span className="flex items-center">
                        <span className="whitespace-nowrap">{backData.label.split("/")[0]}/</span>
                        <span className={`transition-all duration-700 ease-out overflow-hidden whitespace-nowrap ${isExpanded ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0"}`}>
                            {backData.label.split("/")[1] || ""}
                        </span>
                    </span>
                    {backData.verified && <VerifiedBadge verified={true} className="shrink-0" />}
                </div>
            </div>
        </div>
    );
};

const StatItem = ({ count, label }) => (
    <div className="flex flex-col items-center sm:items-start">
        <span className="text-2xl font-bold text-gray-700 font-serif tracking-tight">
            {count}
        </span>
        <span className="text-sm text-gray-500 font-medium">{label}</span>
    </div>
);

const FeaturedCard = ({ profile, showAvatarInside = true }) => {
    if (!profile) return null;
    return (
        <div className="featured-card relative flex flex-col items-center pt-14 px-4 pb-6 rounded-xl transition-all duration-300 border border-yellow-400/50 bg-white/40 shadow-sm backdrop-blur-md hover:bg-white/60 hover:shadow-[0_0_15px_rgba(250,204,21,0.3)]">
            {/* Avatar - straddles the top border, matches hero white-circle wrapper and hover scale (optional) */}
            {showAvatarInside && (
                <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999]">
                    <div className="rounded-full shadow-xl border-2 border-white bg-white/90 p-1 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform overflow-hidden" style={{ width: 64 + 8, height: 64 + 8 }}>
                        <ProfileAvatar profile={profile} size={64} className="rounded-full" />
                    </div>
                </div>
            )}

            <div className="flex items-center gap-1 mb-1">
                <h3 className="font-bold text-gray-800">{profile.name}</h3>
                {(profile.address_verified || profile.verified) && (
                    <VerifiedBadge verified={true} />
                )}
            </div>
            {profile.bio?.trim() ? (
                <p className="text-sm text-gray-500 text-center mb-2 px-2 leading-tight whitespace-pre-wrap">
                    {profile.bio.trim()}
                </p>
            ) : null}
            <div className="pt-2 text-sm text-gray-500 flex flex-col items-center gap-1">
                {profile.nearest_city_name && (
                    <div className="flex items-start justify-center gap-2">
                        <span className="flex items-start justify-center gap-1 text-center text-gray-500 max-w-[12rem]">
                            <svg className="w-4 h-4 flex-shrink-0 self-start mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <span className="text-center break-words leading-tight">{profile.nearest_city_name}</span>
                        </span>
                    </div>
                )}
                {profile.created_at && (
                    <div className="flex items-start justify-center gap-1.5 text-gray-500">
                        <svg className="w-4 h-4 flex-shrink-0 self-start mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-center">Since {new Date(profile.created_at || Date.now()).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const FlippingAvatar = ({ initialProfile, pool, delay = 0, className }) => {
    const router = useRouter();

    const [isFront, setIsFront] = useState(true);
    const [frontProfile, setFrontProfile] = useState(initialProfile);
    const [backProfile, setBackProfile] = useState(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 500 + delay);
        return () => clearTimeout(timer);
    }, [delay]);

    // IMPORTANT: pool identity changes every render in your parent (profiles.filter(...)),
    // so do NOT depend on `pool` in the flipping effect. Keep latest pool in a ref.
    const poolRef = useRef(pool);
    useEffect(() => {
        poolRef.current = pool;
    }, [pool]);

    const isFlippingRef = useRef(false);

    const randomFromPool = () => {
        const p = poolRef.current || [];
        if (p.length === 0) return null;
        return p[Math.floor(Math.random() * p.length)];
    };

    // initialize back face once (or when initialProfile changes)
    useEffect(() => {
        setFrontProfile(initialProfile);
        const r = randomFromPool();
        setBackProfile(r);
    }, [initialProfile]);

    useEffect(() => {
        if (!isVisible) return;
        const interval = setInterval(() => {
            isFlippingRef.current = true;
            setIsFront(prev => !prev);
        }, 5000 + delay);

        return () => clearInterval(interval);
    }, [delay, isVisible]);

    const activeProfile = isFront ? frontProfile : backProfile;

    return (
        <div
            className={`perspective-1000 transition-all duration-1000 ease-out transform scale-100 opacity-100 ${className}`}
            onClick={(e) => {
                e.preventDefault();
                if (activeProfile) router.push("/" + activeProfile.name);
            }}
        >
            <div
                className={`relative w-full h-full transition-transform duration-1000 transform-style-3d ${isFront ? "" : "rotate-y-180"
                    }`}
                onTransitionEnd={(e) => {
                    if (e.propertyName !== "transform") return;
                    if (!isFlippingRef.current) return;

                    isFlippingRef.current = false;
                    const r = randomFromPool();
                    if (!r) return;

                    if (isFront) {
                        setBackProfile(r);
                    } else {
                        setFrontProfile(r);
                    }
                }}
            >
                {/* Front Face */}
                <div className="absolute inset-0 backface-hidden flex items-center justify-center">
                    <div className="rounded-full shadow-sm border border-white bg-white/90 p-0.5 w-full h-full flex items-center justify-center overflow-hidden">
                        {frontProfile ? (
                            <ProfileAvatar profile={frontProfile} size={56} className="rounded-full" />
                        ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-r from-gray-300 to-gray-400 animate-pulse" />
                        )}
                    </div>
                </div>

                {/* Back Face */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 flex items-center justify-center">
                    <div className="rounded-full shadow-sm border border-white bg-white/90 p-0.5 w-full h-full flex items-center justify-center overflow-hidden">
                        {backProfile ? (
                            <ProfileAvatar profile={backProfile} size={56} className="rounded-full" />
                        ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-r from-gray-300 to-gray-400 animate-pulse" />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};


export default function SplashPage({ initialProfiles = null }) {
    const router = useRouter();
    const { profiles } = useProfiles(initialProfiles, true);
    const [search, setSearch] = useState("");
    const [openFaqIndex, setOpenFaqIndex] = useState(0);
    const [featuredProfiles, setFeaturedProfiles] = useState([]);
    // Scroller refs/state for featured profiles
    const featuredRef = useRef(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);
    const firstVisibleRef = useRef(-1);
    const lastVisibleRef = useRef(-1);
    const headerRef = useRef(null);
    const heroSearchRef = useRef(null);
    const [isSearchSticky, setIsSearchSticky] = useState(false);
    const getItemsPerPage = () => {
        if (typeof window === "undefined") return 2;
        const width = window.innerWidth;
        if (width >= 1280) return 6;
        if (width >= 1024) return 5;
        if (width >= 768) return 4;
        return 2;
    };
    const [itemsPerPage, setItemsPerPage] = useState(getItemsPerPage());

    useEffect(() => {
        const onResize = () => setItemsPerPage(getItemsPerPage());
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const faqItems = [
        {
            question: "What is a zcash.me name?",
            answer: "It is a human-readable name that points to your Zcash address, so people can send you funds without copying long strings."
        },
        {
            question: "How do I get verified?",
            answer: "Link a valid address and complete the verification steps to prove you control it. Verified profiles get a badge and more trust."
        },
        {
            question: "Can I update my profile later?",
            answer: "Yes. You can edit your bio, links, and public details any time without changing your name."
        },
        {
            question: "Is my address private?",
            answer: "You control what you show. Keep your profile minimal, or share more if you want to be easily found."
        },
        {
            question: "What does it cost?",
            answer: "Creating a name is straightforward. Any fees are disclosed during registration, with no hidden charges."
        }
    ];

    const featuredScrollBy = (dir = 1) => {
        const el = featuredRef.current;
        if (!el) return;
        const realCount = featuredProfiles.length;
        const cloneCount = Math.min(itemsPerPage, realCount);

        if (realCount > itemsPerPage) {
            const firstVisible = firstVisibleRef.current;
            const lastVisible = lastVisibleRef.current;

            if (dir < 0 && firstVisible >= 0 && firstVisible <= cloneCount) {
                const targetIdx = cloneCount + realCount - 1;
                jumpToIndexInstant(targetIdx);
            } else if (dir > 0 && lastVisible >= cloneCount + realCount - 1) {
                const targetIdx = cloneCount;
                jumpToIndexInstant(targetIdx);
            }
        }

        const scrollAmount = el.clientWidth; // move a 'frame' (shows 4 cards on md)
        el.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
    };

    // Wrap / carousel helpers
    const isJumpingRef = useRef(false);

    const jumpToIndexInstant = (targetIdx) => {
        const el = featuredRef.current;
        if (!el) return;
        const cards = Array.from(el.querySelectorAll('[data-card]'));
        if (!cards[targetIdx]) return;
        const offset = cards[targetIdx].getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft;
        isJumpingRef.current = true;
        // Temporarily disable smooth scrolling
        const prev = el.style.scrollBehavior;
        el.style.scrollBehavior = 'auto';
        el.scrollLeft = offset;
        // force a reflow and restore
        requestAnimationFrame(() => {
            el.style.scrollBehavior = prev || '';
            isJumpingRef.current = false;
            // update arrow visibility immediately
            if (typeof window !== 'undefined') setTimeout(() => {
                const ev = new Event('scroll');
                el.dispatchEvent(ev);
            }, 20);
        });
    };



    useEffect(() => {
        const el = featuredRef.current;
        if (!el) return;
        let localTimeout = null;
        let rafId = null;
        let lastScrollLeft = el.scrollLeft;
        let lastScrollTs = performance.now();
        let lastVelocity = 0;

        const updateAll = () => {
            const THRESH = 6;
            const rect = el.getBoundingClientRect();
            const cards = Array.from(el.querySelectorAll('[data-card]'));
            if (cards.length === 0) {
                setShowLeftArrow(false);
                setShowRightArrow(false);
                return;
            }

            let firstVisible = -1;
            let lastVisible = -1;

            cards.forEach((card, i) => {
                const r = card.getBoundingClientRect();
                const isVisible = (r.right > rect.left + THRESH) && (r.left < rect.right - THRESH);
                if (isVisible) {
                    if (firstVisible === -1) firstVisible = i;
                    lastVisible = i;
                }
            });

            const maxScroll = el.scrollWidth - el.clientWidth;
            if (firstVisible === -1) {
                setShowLeftArrow(el.scrollLeft > THRESH);
                setShowRightArrow(el.scrollLeft < Math.max(1, maxScroll - THRESH));
                return;
            }

            setShowLeftArrow(firstVisible > 0 || el.scrollLeft > THRESH);
            setShowRightArrow(lastVisible < cards.length - 1 || (el.scrollWidth > el.clientWidth + THRESH && el.scrollLeft < Math.max(1, maxScroll - THRESH)));
            firstVisibleRef.current = firstVisible;
            lastVisibleRef.current = lastVisible;
        };

        const scheduleUpdate = () => {
            if (rafId) return;
            rafId = requestAnimationFrame(() => {
                rafId = null;
                updateAll();
            });
        };

        const wrapCheck = () => {
            if (Math.abs(lastVelocity) > 0.15) {
                localTimeout = setTimeout(wrapCheck, 120);
                return;
            }
            const cards = Array.from(el.querySelectorAll('[data-card]'));
            const realCount = featuredProfiles.length;
            const cloneCount = Math.min(itemsPerPage, realCount);

            if (!cards.length) return;
            if (realCount === 0) return;
            if (realCount <= itemsPerPage) return;

            const rect = el.getBoundingClientRect();
            let firstVisible = -1;
            let lastVisible = -1;
            cards.forEach((c, i) => {
                const r = c.getBoundingClientRect();
                const isVisible = (r.right > rect.left + 6) && (r.left < rect.right - 6);
                if (isVisible) {
                    if (firstVisible === -1) firstVisible = i;
                    lastVisible = i;
                }
            });

            if (firstVisible !== -1 && firstVisible < cloneCount) {
                const delta = cloneCount - firstVisible;
                const targetRealIndex = realCount - delta;
                const targetIdx = cloneCount + targetRealIndex;
                jumpToIndexInstant(targetIdx);
                return;
            }

            if (lastVisible !== -1 && lastVisible >= cloneCount + realCount) {
                const delta = lastVisible - (cloneCount + realCount - 1);
                const targetRealIndex = delta;
                const targetIdx = cloneCount + targetRealIndex;
                jumpToIndexInstant(targetIdx);
            }
        };

        const handleScroll = () => {
            if (isJumpingRef.current) return;
            const now = performance.now();
            const delta = el.scrollLeft - lastScrollLeft;
            const dt = Math.max(1, now - lastScrollTs);
            lastVelocity = delta / dt;
            lastScrollLeft = el.scrollLeft;
            lastScrollTs = now;
            scheduleUpdate();

            const realCount = featuredProfiles.length;
            const cloneCount = Math.min(itemsPerPage, realCount);
            if (realCount > itemsPerPage) {
                const cards = Array.from(el.querySelectorAll('[data-card]'));
                if (cards.length) {
                    const firstVisible = firstVisibleRef.current;
                    const lastVisible = lastVisibleRef.current;

                    if (delta < 0 && firstVisible >= 0 && firstVisible < cloneCount) {
                        const from = firstVisible;
                        const to = from + realCount;
                        if (cards[to]) {
                            isJumpingRef.current = true;
                            const offset = cards[to].offsetLeft - cards[from].offsetLeft;
                            el.scrollLeft += offset;
                            lastScrollLeft = el.scrollLeft;
                            requestAnimationFrame(() => { isJumpingRef.current = false; });
                        }
                    } else if (delta > 0 && lastVisible >= cloneCount + realCount) {
                        const from = lastVisible;
                        const to = from - realCount;
                        if (cards[to]) {
                            isJumpingRef.current = true;
                            const offset = cards[from].offsetLeft - cards[to].offsetLeft;
                            el.scrollLeft -= offset;
                            lastScrollLeft = el.scrollLeft;
                            requestAnimationFrame(() => { isJumpingRef.current = false; });
                        }
                    }
                }
            }

            if (localTimeout) clearTimeout(localTimeout);
            localTimeout = setTimeout(wrapCheck, 120);
        };

        el.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', scheduleUpdate);

        let ro;
        if (window.ResizeObserver) {
            ro = new ResizeObserver(scheduleUpdate);
            ro.observe(el);
        }

        const imgs = el.querySelectorAll('img');
        const imgHandlers = [];
        imgs.forEach(img => {
            if (img.complete) return;
            const h = () => { scheduleUpdate(); img.removeEventListener('load', h); };
            img.addEventListener('load', h);
            imgHandlers.push({ img, h });
        });

        const realCount = featuredProfiles.length;
        const cloneCount = Math.min(itemsPerPage, realCount);
        if (realCount > itemsPerPage) {
            setTimeout(() => {
                const cards = Array.from(el.querySelectorAll('[data-card]'));
                const targetIdx = cloneCount;
                if (cards[targetIdx]) {
                    const offset = cards[targetIdx].getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft;
                    el.style.scrollBehavior = 'auto';
                    el.scrollLeft = offset;
                    requestAnimationFrame(() => { el.style.scrollBehavior = ''; });
                }
                scheduleUpdate();
            }, 40);
        } else {
            scheduleUpdate();
        }

        return () => {
            el.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', scheduleUpdate);
            if (ro) ro.disconnect();
            imgHandlers.forEach(({ img, h }) => img.removeEventListener('load', h));
            if (localTimeout) clearTimeout(localTimeout);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [featuredProfiles, itemsPerPage]);



    const [heroBadges, setHeroBadges] = useState([]);
    const [heroProfile, setHeroProfile] = useState(null);
    const [flankingProfiles, setFlankingProfiles] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        let rafId = null;
        const updateSticky = () => {
            rafId = null;
            const searchEl = heroSearchRef.current;
            if (!searchEl) return;
            const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0;
            const searchTop = searchEl.getBoundingClientRect().top;
            const nextSticky = searchTop <= headerHeight + 8;
            setIsSearchSticky(prev => (prev === nextSticky ? prev : nextSticky));
        };

        const onScroll = () => {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(updateSticky);
        };

        updateSticky();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (profiles.length > 0) {
            // 1. Featured Profiles Logic — prefer explicit featured flag; fallback to prior heuristic
            const featuredDeck = profiles.filter(p => p.featured);
            const targets = ["beyefendi", "zooko", "taylorc", "adi"];
            const found = targets.map(name =>
                profiles.find(p => p.name?.toLowerCase() === name || p.slug === name)
            ).filter(Boolean);

            if (featuredDeck.length > 0) {
                setFeaturedProfiles(featuredDeck);
            } else {
                if (found.length < 4) {
                    const others = profiles
                        .filter(p => (p.featured || p.address_verified) && !found.includes(p))
                        .sort(() => 0.5 - Math.random())
                        .slice(0, 4 - found.length);
                    setFeaturedProfiles([...found, ...others]);
                } else {
                    setFeaturedProfiles(found);
                }
            }

            // 2. Hero Badges Logic (Pick 5 random VERIFIED profiles)
            const verifiedDecks = profiles
                .filter(p => p.address_verified && !found.includes(p) && p.name)
                .sort(() => 0.5 - Math.random())
                .slice(0, 5);

            // Fallback mock data if not enough verified profiles
            const mockBadges = [
                { name: "uni", verified: true },
                { name: "anon", verified: true },
                { name: "ledger", verified: true },
                { name: "satoshi", verified: true },
                { name: "nbz", verified: true }
            ];

            const combinedBadges = verifiedDecks.length >= 5
                ? verifiedDecks
                : [...verifiedDecks, ...mockBadges.slice(verifiedDecks.length)];

            setHeroBadges(combinedBadges);

            setHeroBadges(combinedBadges);

            // 3. Hero Profile Logic (zechariah-415)
            // Try explicit slug first, then loose name match
            const zechariah = profiles.find(p =>
                p.slug === "zechariah-415" ||
                p.name?.toLowerCase().includes("zechariah") ||
                p.slug?.toLowerCase().includes("zechariah")
            );

            if (zechariah) {
                setHeroProfile(zechariah);
            } else if (profiles.length > 0) {
                // Fallback to first profile if zechariah not found
                setHeroProfile(profiles[0]);
            }

            if (zechariah || (profiles.length > 0)) {
                const target = zechariah || profiles[0];
                // 4. Flanking Profiles Logic
                // Pick 2 other random verified/featured profiles
                const others = profiles.filter(p =>
                    p !== target &&
                    (p.address_verified || p.featured || p.rank_alltime > 0) &&
                    p.profile_image_url // Ensure they have an image
                );

                const shuffled = others.sort(() => 0.5 - Math.random()).slice(0, 2);
                setFlankingProfiles(shuffled);
            }
        }
    }, [profiles]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (search.trim()) {
            router.push(`/?search=${encodeURIComponent(search)}`);
        } else {
            router.push("/");
        }
    };

    const normalizeSearch = (s = "") =>
        s
            .toLowerCase()
            .replace(/^https?:\/\/(www\.)?[^/]+\/?/, "")
            .trim();

    const q = normalizeSearch(search);
    const filteredResults = q
        ? profiles.filter((p) =>
            p.name?.toLowerCase().includes(q) ||
            p.link_search_text?.includes(q)
        ).slice(0, 5)
        : [];

    const exactMatch = profiles.find(p => p.name?.toLowerCase() === q);
    const showClaimRow = q && q.length >= 2 && (!exactMatch || !(exactMatch.address_verified || exactMatch.verified));

    const renderSearchBar = (wrapperClassName = "", wrapperRef = null) => (
        <div ref={wrapperRef} className={`p-1 border border-gray-200/50 rounded-[21px] bg-white/30 backdrop-blur-sm shadow-sm group/search relative ${wrapperClassName}`}>
            <form ref={dropdownRef} onSubmit={handleSearch} className="relative z-[900]">
                {/* SVG Border Layer */}
                <svg
                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Traveling Green Line - Active only when NOT hovered/focused */}
                    <rect
                        x="0.5"
                        y="0.5"
                        width="calc(100% - 1px)"
                        height="calc(100% - 1px)"
                        rx="16"
                        pathLength="1000"
                        fill="transparent"
                        stroke="#16a34a"
                        strokeWidth="1"
                        strokeDasharray="100 900"
                        className="animate-travel group-hover/search:opacity-0 group-focus-within:opacity-0 transition-opacity duration-300"
                    />
                    {/* Solid Green Border - Active ONLY on Hover/Focus */}
                    <rect
                        x="0.5"
                        y="0.5"
                        width="calc(100% - 1px)"
                        height="calc(100% - 1px)"
                        rx="16"
                        fill="transparent"
                        stroke="#16a34a"
                        strokeWidth="1"
                        className="opacity-0 group-hover/search:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300"
                    />
                </svg>

                <input
                    type="text"
                    placeholder="Search names"
                    className="w-full pl-6 pr-12 py-4 rounded-2xl bg-white border border-gray-300 shadow-inner focus:outline-none focus:ring-0 text-gray-700 font-medium placeholder:text-gray-300 text-center transition-all backdrop-blur-sm"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                />
                <button
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-gray-600 transition-colors z-20"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>

                {showDropdown && (filteredResults.length > 0 || showClaimRow) && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-[1000] overflow-hidden rounded-2xl border border-orange-100 bg-white/90 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] transition-all">
                        <div className="divide-y divide-gray-100">
                            {/* Claim Row */}
                            {showClaimRow && (
                                <div
                                    onClick={() => router.push(`/?search=${encodeURIComponent(q)}&autoOpenAdd=1`)}
                                    className="group/item px-6 py-4 flex items-center justify-between hover:bg-pink-50/50 cursor-pointer transition-colors border-b-2 border-pink-100"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-normal group-hover/item:scale-110 transition-transform text-2xl shadow-inner">
                                            +
                                        </div>
                                        <div className="text-left">
                                            <div className="text-xl font-normal text-gray-900 leading-none mb-1">zcash.me/{q.replace(/\s+/g, '_')}</div>
                                            <div className="text-sm text-pink-500 font-normal">Available Now</div>
                                        </div>
                                    </div>
                                    <button className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-2.5 rounded-xl font-normal text-sm shadow-[0_4px_14px_0_rgba(236,72,153,0.39)] transition-all active:scale-95 flex items-center gap-2">
                                        Claim
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7-7 7M5 12h16" /></svg>
                                    </button>
                                </div>
                            )}

                            {/* Profile Matches */}
                            {filteredResults.map((p) => (
                                <div
                                    key={p.id}
                                    onClick={() => {
                                        router.push("/" + (p.name || p.id));
                                        setShowDropdown(false);
                                    }}
                                    className="group/item px-6 py-4 flex items-center justify-between hover:bg-gray-50/80 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <ProfileAvatar profile={p} size={60} className="rounded-full shadow-lg border-2 border-white ring-4 ring-gray-50" />
                                        <div className="text-left">
                                            <div className="text-xl font-normal text-gray-900 flex items-center gap-2 leading-tight">
                                                {p.name}
                                                {(p.address_verified || p.verified) ? (
                                                    <VerifiedBadge verified={true} />
                                                ) : (
                                                    <>
                                                        <VerifiedBadge verified={false} />
                                                        <span className="text-xs text-gray-400">-{p.id}</span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-1 font-normal mt-0.5">
                                                {p.nearest_city_name && (
                                                    <span className="flex items-center gap-1 text-gray-500">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                        {p.nearest_city_name}
                                                    </span>
                                                )}
                                                {p.created_at && (
                                                    <span className="flex items-center gap-1.5 text-gray-500">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        Since {new Date(p.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-gray-400 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all bg-white p-2.5 rounded-full shadow-md border border-gray-100">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </form>
        </div>
    );

    // Prepare carousel arrays with clones for seamless wrap-around
    const displayFeatured = useMemo(() => {
        const realCount = featuredProfiles.length;
        const cloneCount = Math.min(itemsPerPage, realCount);
        if (realCount > itemsPerPage) {
            const leftClones = featuredProfiles.slice(-cloneCount);
            const rightClones = featuredProfiles.slice(0, cloneCount);
            return [...leftClones, ...featuredProfiles, ...rightClones];
        }
        return [...featuredProfiles];
    }, [featuredProfiles, itemsPerPage]);

    // Expose counts for clone detection when rendering
    const realCount = featuredProfiles.length;
    const cloneCount = Math.min(itemsPerPage, realCount);

    // Keep card heights dynamic (size-to-content) and clear any leftover inline heights
    useEffect(() => {
        const el = featuredRef.current;
        if (!el) return;
        const resetHeights = () => {
            const cards = Array.from(el.querySelectorAll('[data-card] .featured-card'));
            cards.forEach(c => { c.style.height = ''; c.style.minHeight = ''; });
        };

        // Run once after layout and when images load (clears any inline heights left over)
        const t = setTimeout(resetHeights, 60);
        window.addEventListener('resize', resetHeights);

        const imgs = el.querySelectorAll('img');
        const handlers = [];
        imgs.forEach(img => {
            if (img.complete) return;
            const h = () => { resetHeights(); img.removeEventListener('load', h); };
            img.addEventListener('load', h);
            handlers.push({ img, h });
        });

        return () => {
            clearTimeout(t);
            window.removeEventListener('resize', resetHeights);
            handlers.forEach(({ img, h }) => img.removeEventListener('load', h));
        };
    }, [displayFeatured, itemsPerPage, featuredProfiles]);

    return (
        <div
            className="min-h-screen bg-fixed bg-cover bg-center bg-no-repeat selection:bg-orange-200 relative"
            style={{ backgroundImage: `url(${forestCityBg})` }}
        >
            {/* Global Overlay for readability across all sections */}
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] pointer-events-none"></div>

            {/* Navigation - Transparent */}
            <nav ref={headerRef} className="relative max-w-6xl mx-auto px-6 py-4 flex items-center justify-between z-20">
                <div className="flex items-center gap-2">
                    <img
                        src={zcashMeLogo}
                        alt="Zcash.me"
                        className="h-8 w-auto cursor-pointer"
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    />
                </div>

            </nav>

            {isSearchSticky && (
                <div className="fixed top-0 left-0 right-0 z-[1000]">
                    <div className="max-w-6xl mx-auto px-6 py-2">
                        {renderSearchBar("max-w-lg mx-auto bg-white/70")}
                    </div>
                </div>
            )}

            {/* Hero Section Container - Now transparent as background is global */}
            <div
                className="relative w-full z-[100]"
            >
                <section className="relative pt-20 pb-10 max-w-4xl mx-auto text-center px-4">
                    {/* Floating Badges (Decorative) */}

                    {/* Hero Box Wrapper - Slightly more frosted glass effect */}
                    <div className="relative group/hero pt-20 pb-10 md:pt-28 md:pb-14 px-8 md:px-12 rounded-2xl transition-all duration-300 border border-yellow-400/50 bg-white/50 shadow-sm backdrop-blur-md hover:bg-white/70 hover:shadow-[0_0_20px_rgba(250,204,21,0.3)] z-[500]">
                        {/* Floating Badges (Always rendered, initially show "zcash.me" then expand) */}
                        <>
                            <FlippingBadge pool={profiles.filter(p => p.address_verified || p.verified)} initialLabel={heroBadges.length > 0 ? `zcash.me/${heroBadges[0].name}` : "zcash.me"} initialVerified={heroBadges.length > 0 ? heroBadges[0].address_verified || heroBadges[0].verified : false} className="-top-10 left-[5%] -rotate-6 flex scale-75 sm:scale-100 z-[600]" delay={100} />
                            <FlippingBadge pool={profiles.filter(p => p.address_verified || p.verified)} initialLabel={heroBadges.length > 1 ? `zcash.me/${heroBadges[1].name}` : "zcash.me"} initialVerified={heroBadges.length > 1 ? heroBadges[1].address_verified || heroBadges[1].verified : false} className="-top-10 right-[5%] rotate-3 flex scale-75 sm:scale-100 z-[600]" delay={800} />
                            <FlippingBadge pool={profiles.filter(p => p.address_verified || p.verified)} initialLabel={heroBadges.length > 2 ? `zcash.me/${heroBadges[2].name}` : "zcash.me"} initialVerified={heroBadges.length > 2 ? heroBadges[2].address_verified || heroBadges[2].verified : false} className="bottom-10 left-[2%] rotate-6 flex scale-75 sm:scale-100 delay-700 z-[600]" delay={1500} />
                            <FlippingBadge pool={profiles.filter(p => p.address_verified || p.verified)} initialLabel={heroBadges.length > 3 ? `zcash.me/${heroBadges[3].name}` : "zcash.me"} initialVerified={heroBadges.length > 3 ? heroBadges[3].address_verified || heroBadges[3].verified : false} className="-bottom-5 left-[15%] -rotate-3 flex scale-75 sm:scale-100 delay-500 z-[600]" delay={2200} />
                            <FlippingBadge pool={profiles.filter(p => p.address_verified || p.verified)} initialLabel={heroBadges.length > 4 ? `zcash.me/${heroBadges[4].name}` : "zcash.me"} initialVerified={heroBadges.length > 4 ? heroBadges[4].address_verified || heroBadges[4].verified : false} className="bottom-32 right-[2%] -rotate-6 flex scale-75 sm:scale-100 delay-1000 z-[600]" delay={3000} />
                        </>

                        {/* Featured Hero Avatar - Always render, show placeholders while loading */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[700] flex items-center justify-center">

                            {/* Left Flank - swivelling random */}
                            <FlippingAvatar
                                initialProfile={flankingProfiles[0] || null}
                                pool={profiles.filter(p => (p.address_verified || p.featured || p.rank_alltime > 0) && p.profile_image_url)}
                                delay={300} // Small delay after center
                                className="absolute -left-20 sm:-left-24 w-14 h-14 cursor-pointer hover:scale-105 z-0"
                            />

                            {/* Center Hero - FIXED (NON-RANDOM), appears FIRST */}
                            <div
                                className="relative z-10 cursor-pointer hover:scale-110 transition-transform"
                                onClick={() => heroProfile && router.push(`/${heroProfile.name}`)}
                            >
                                <div className="rounded-full shadow-xl border-2 border-white bg-white/90 p-1 flex items-center justify-center overflow-hidden" style={{ width: 96 + 8, height: 96 + 8 }}>
                                    {heroProfile ? (
                                        <ProfileAvatar profile={heroProfile} size={96} className="rounded-full" />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 animate-pulse" />
                                    )}
                                </div>
                            </div>

                            {/* Right Flank - swivelling random */}
                            <FlippingAvatar
                                initialProfile={flankingProfiles[1] || null}
                                pool={profiles.filter(p => (p.address_verified || p.featured || p.rank_alltime > 0) && p.profile_image_url)}
                                delay={600} // Slightly more delay
                                className="absolute -right-20 sm:-right-24 w-14 h-14 cursor-pointer hover:scale-105 z-0"
                            />

                        </div>

                        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 font-serif tracking-tight leading-tight">
                            The easiest way <br />
                            to Zcash you
                        </h1>
                        <p className="text-gray-500 text-lg max-w-xl mx-auto mb-10 leading-relaxed font-light">
                            Sending and receiving Zcash has never been easier. Discover
                            a new way to transact online - fast, private, and secure.
                        </p>

                        {/* Hero Search */}
                        {renderSearchBar(
                            `max-w-lg mx-auto z-[800] ${isSearchSticky ? "invisible pointer-events-none" : ""}`,
                            heroSearchRef
                        )}
                    </div>
                </section>
            </div>

            {/* Social Media Icons - White versions */}
            <section className="relative bg-transparent pt-6 pb-14">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="flex justify-center items-center gap-6">
                        {/* X/Twitter */}
                        <a href="https://x.com/zcashme" target="_blank" rel="noopener noreferrer" className="group">
                            <svg className="w-8 h-8 text-white/80 group-hover:text-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(250,204,21,0.3)]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                        </a>

                        {/* Discord */}
                        <a href="https://discord.gg/zcash" target="_blank" rel="noopener noreferrer" className="group">
                            <svg className="w-8 h-8 text-white/80 group-hover:text-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(250,204,21,0.3)]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
                            </svg>
                        </a>

                        {/* Telegram */}
                        <a href="https://t.me/zcash" target="_blank" rel="noopener noreferrer" className="group">
                            <svg className="w-8 h-8 text-white/80 group-hover:text-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(250,204,21,0.3)]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472c-.18 1.898-.962 6.502-1.36 8.627c-.168.9-.499 1.201-.82 1.23c-.696.065-1.225-.46-1.9-.902c-1.056-.693-1.653-1.124-2.678-1.8c-1.185-.78-.417-1.21.258-1.91c.177-.184 3.247-2.977 3.307-3.23c.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345c-.48.33-.913.49-1.302.48c-.428-.008-1.252-.241-1.865-.44c-.752-.245-1.349-.374-1.297-.789c.027-.216.325-.437.893-.663c3.498-1.524 5.83-2.529 6.998-3.014c3.332-1.386 4.025-1.627 4.476-1.635z" />
                            </svg>
                        </a>

                        {/* GitHub */}
                        <a href="https://github.com/zcash" target="_blank" rel="noopener noreferrer" className="group">
                            <svg className="w-8 h-8 text-white/80 group-hover:text-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(250,204,21,0.3)]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12c0 5.302 3.438 9.8 8.207 11.387c.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416c-.546-1.387-1.333-1.756-1.333-1.756c-1.089-.745.083-.729.083-.729c1.205.084 1.839 1.237 1.839 1.237c1.07 1.834 2.807 1.304 3.492.997c.107-.775.418-1.305.762-1.604c-2.665-.305-5.467-1.334-5.467-5.931c0-1.311.469-2.381 1.236-3.221c-.124-.303-.535-1.524.117-3.176c0 0 1.008-.322 3.301 1.23c.957-.266 1.983-.399 3.003-.404c1.02.005 2.047.138 3.006.404c2.291-1.552 3.297-1.23 3.297-1.23c.653 1.653.242 2.874.118 3.176c.77.84 1.235 1.911 1.235 3.221c0 4.609-2.807 5.624-5.479 5.921c.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576c4.765-1.589 8.199-6.086 8.199-11.386c0-6.627-5.373-12-12-12z" />
                            </svg>
                        </a>
                    </div>
                </div>
            </section>



            {/* Zcasher Profiles (Community Feed) - Transparent */}
            <section className="relative py-0 w-full px-6 overflow-visible">

                <div className="mb-4 flex items-center justify-center">
                    <div
                        className="w-full text-center text-4xl md:text-5xl font-bold text-gray-700 border-b border-gray-200 pb-2"
                        style={{ fontFamily: '"Brush Script MT", "Comic Sans MS", cursive' }}
                    >
                        Featured Profiles
                    </div>
                </div>

                <div className="relative mb-10 overflow-visible">
                    {/* Left arrow - hidden until there's space to scroll back */}
                    <button
                        aria-label="Scroll featured left"
                        onClick={() => { featuredScrollBy(-1); }}
                        className={`flex items-center justify-center z-20 absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 md:-translate-x-2 h-12 md:h-14 w-8 rounded-md border border-orange-100 bg-white/60 shadow-sm transition-opacity ${showLeftArrow ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                    >
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>

                    <div ref={featuredRef} className="overflow-x-auto overflow-y-visible no-scrollbar snap-x snap-mandatory pt-20 -mt-10">
                        <div className="flex gap-4 transition-transform items-start px-2 md:px-0" style={{ willChange: 'transform' }}>
                            {displayFeatured.map((p, i) => {
                                const isClone = (realCount > itemsPerPage) && (i < cloneCount || i >= cloneCount + realCount);
                                return (
                                    <div key={`featured-${p.id}-${i}`} data-card data-clone={isClone ? true : undefined} className="flex-none w-1/2 md:w-1/4 lg:w-1/5 xl:w-1/6 snap-start relative overflow-visible">
                                        {/* External avatar placed on wrapper so it visually straddles the card top like the hero avatar */}
                                        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999]">
                                            <div onClick={() => router.push(`/${p.name}`)} className="rounded-full shadow-xl border-2 border-white bg-white/90 p-1 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform overflow-hidden" style={{ width: 64 + 8, height: 64 + 8 }}>
                                                <ProfileAvatar profile={p} size={64} className="rounded-full" />
                                            </div>
                                        </div>

                                        <FeaturedCard profile={p} showAvatarInside={false} />
                                    </div>
                                );
                            })}

                            {/* Placeholder cards - show first 4 placeholders until cards load */}
                            {displayFeatured.length === 0 && [0, 1, 2, 3, 4, 5].map((i) => (
                                <div key={`placeholder-${i}`} className="flex-none w-1/2 md:w-1/4 lg:w-1/5 xl:w-1/6 snap-start relative overflow-visible">
                                    {/* Placeholder avatar */}
                                    <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999]">
                                        <div className="rounded-full shadow-xl border-2 border-white bg-white/90 p-1 flex items-center justify-center overflow-hidden" style={{ width: 64 + 8, height: 64 + 8 }}>
                                            <div className="w-full h-full rounded-full bg-gradient-to-r from-gray-300 to-gray-400 animate-pulse" />
                                        </div>
                                    </div>

                                    {/* Placeholder card */}
                                    <div className="featured-card relative flex flex-col items-center pt-14 px-4 pb-6 rounded-xl transition-all duration-300 border border-yellow-400/50 bg-white/40 shadow-sm backdrop-blur-md">
                                        {/* Placeholder name */}
                                        <div className="h-4 w-24 bg-gray-300 rounded animate-pulse mb-2" />
                                        
                                        {/* Placeholder bio */}
                                        <div className="h-3 w-32 bg-gray-200 rounded animate-pulse mb-3" />
                                        <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-4" />
                                        
                                        {/* Placeholder location */}
                                        <div className="pt-2 w-full space-y-2">
                                            <div className="h-3 w-28 bg-gray-200 rounded animate-pulse mx-auto" />
                                            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mx-auto" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right arrow */}
                    <button
                        aria-label="Scroll featured right"
                        onClick={() => { featuredScrollBy(1); }}
                        className={`flex items-center justify-center z-20 absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 md:translate-x-2 h-12 md:h-14 w-8 rounded-md border border-orange-100 bg-white/60 shadow-sm transition-opacity ${showRightArrow ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                    >
                        <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>

                    {featuredProfiles.length === 0 && (
                        <div className="text-center text-gray-400 py-10 italic">Loading top profiles...</div>
                    )}
                </div>

            </section>

            {/* More Reasons Section - Stacked Cards */}
            <section className="relative py-20 bg-white/5 border-t border-orange-100/30 z-10">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="mb-10">
                        <h2 className="text-4xl font-bold font-serif text-gray-800 mb-4">More reasons to join</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Your Zcash name is anchored in Web3, but works across the internet too. It's uniquely simple, memorable, and unmistakably yours.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="rounded-2xl bg-white/40 backdrop-blur-md border border-yellow-400/50 p-6 shadow-sm transition-all duration-300 hover:bg-white/60 hover:shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                            <div className="flex items-start justify-between gap-6">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Keep it simple, stupid</h3>
                                    <p className="text-sm text-gray-500">Don't guess whether a wallet is active, don't share long strings across clipboards. Lose the anxiety, keep the privacy.</p>
                                </div>
                                <div className="shrink-0 rounded-2xl bg-orange-100 border border-orange-200/60 p-3 text-orange-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-3-3v6m7-2a8 8 0 11-14.906-3.5" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-white/40 backdrop-blur-md border border-yellow-400/50 p-6 shadow-sm transition-all duration-300 hover:bg-white/60 hover:shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                            <div className="flex items-start justify-between gap-6">
                                <div>
                                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-4">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Search socials</h3>
                                    <p className="text-sm text-gray-500 mb-6">Know someone from another platform? Search using their handles. Many profiles are verified.</p>

                                    <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 shadow-sm">
                                        <div className="font-medium text-sm text-gray-400 border-b border-gray-100 pb-2 mb-2">@justsuki</div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden"><img src="https://github.com/beyefendi.png" alt="av" /></div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-800 flex items-center gap-1">beyefendi <span className="text-green-500 text-[10px]">?-?</span></div>
                                                    <div className="text-[10px] text-gray-400">zcash.me/beyefendi</div>
                                                </div>
                                            </div>
                                            <div className="text-green-500">?o"</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0 rounded-2xl bg-orange-100 border border-orange-200/60 p-3 text-orange-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 6a4 4 0 018 0v4a4 4 0 11-8 0V6z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 10v4a6 6 0 0012 0v-4" /></svg>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl bg-white/40 backdrop-blur-md border border-yellow-400/50 p-6 shadow-sm transition-all duration-300 hover:bg-white/60 hover:shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                            <div className="flex items-start justify-between gap-6">
                                <div>
                                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-4">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Referral rewards</h3>
                                    <p className="text-sm text-gray-500 mb-6">Invite your friends and earn Zcash every time they get verified, helping the community grow.</p>

                                    <div className="flex items-center justify-center gap-4 py-4">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300"><img src="https://github.com/beyefendi.png" alt="av" /></div>
                                            <span className="text-[10px] font-bold text-gray-600">beyefendi</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-gray-400 text-xs">?+'</span>
                                            <div className="bg-yellow-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">100 ZEC</div>
                                            <span className="text-gray-400 text-xs">?+'</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300"><img src="https://github.com/octocat.png" alt="av" /></div>
                                            <span className="text-[10px] font-bold text-gray-600">friend</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0 rounded-2xl bg-orange-100 border border-orange-200/60 p-3 text-orange-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v8m-4-4h8" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* FAQ Section - Stacked Cards */}
            <section className="relative py-20 bg-white/5 border-t border-orange-100/30 z-10">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="mb-10">
                        <h2 className="text-4xl font-bold font-serif text-gray-800 mb-4">Frequently asked questions</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Quick answers to the things people ask most about zcash.me.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {faqItems.map((item, idx) => {
                            const isOpen = openFaqIndex === idx;
                            return (
                                <div key={item.question} className="rounded-2xl bg-white/40 backdrop-blur-md border border-yellow-400/50 p-6 shadow-sm transition-all duration-300 hover:bg-white/60 hover:shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                                    <div className="flex items-start justify-between gap-6">
                                        <div>
                                            <h3 className="text-xl font-semibold text-gray-800 mb-2">{item.question}</h3>
                                            {isOpen && (
                                                <p className="text-sm text-gray-500">{item.answer}</p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            aria-label={isOpen ? "Collapse answer" : "Expand answer"}
                                            onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                                            className="shrink-0 rounded-2xl bg-orange-100 border border-orange-200/60 p-3 text-orange-600 transition-transform duration-300 hover:scale-105"
                                        >
                                            <svg className={`w-6 h-6 transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v12m6-6H6" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
            {/* Footer - Transparent */}
            <footer className="relative bg-transparent text-gray-500 py-12 px-6 border-t border-orange-100/30 z-10">
                <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="col-span-2 md:col-span-1">
                        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center mb-4 text-white font-bold text-xl">
                            ƒs­
                        </div>
                        <p className="text-xs text-gray-500">Ac 2024 Zcash me</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <h4 className="text-gray-200 font-bold mb-2">Join the community</h4>
                        <a href="#" className="hover:text-white transition-colors">Discord</a>
                        <a href="#" className="hover:text-white transition-colors">Twitter</a>
                        <a href="#" className="hover:text-white transition-colors">Telegram</a>
                    </div>

                    <div className="flex flex-col gap-2">
                        <h4 className="text-gray-200 font-bold mb-2">Need help?</h4>
                        <a href="#" className="hover:text-white transition-colors">Support</a>
                        <a href="#" className="hover:text-white transition-colors">Contact</a>
                    </div>

                    <div className="flex flex-col gap-2">
                        <h4 className="text-gray-200 font-bold mb-2">Legal</h4>
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms of Use</a>
                    </div>
                </div>
            </footer>

            <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .delay-500 { animation-delay: 500ms; }
        .delay-700 { animation-delay: 700ms; }
        .delay-1000 { animation-delay: 1000ms; }
        
        /* 3D Flip Utilities */
        .perspective-1000 { perspective: 1000px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .rotate-x-180 { transform: rotateX(180deg); }

        /* Hide scrollbars but keep touch scrolling smooth */
        .no-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
          -webkit-overflow-scrolling: touch;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }

`}</style>
        </div>
    );
}






