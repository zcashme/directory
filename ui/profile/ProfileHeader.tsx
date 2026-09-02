"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import type { Profile } from "@/lib/profile/types";
import ProfileSearchDropdown from "@/ui/profile/ProfileSearchDropdown";

import { useJoinModal } from "@/ui/signup/JoinModalContext";
import { buildSlug } from "@/lib/profile/profileUtils";
import {
  NAVIGATION_PROGRESS_FINISH_EVENT,
  NAVIGATION_PROGRESS_START_EVENT,
} from "@/lib/navigation/navigationProgress";

interface ProfileHeaderProps {
  profileCount?: number;
}

type NavigationProgressDirection = "ltr" | "rtl";

export default function ProfileHeader({ profileCount = 0 }: ProfileHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const [search, setSearch] = useState("");
  const { isJoinOpen, openJoin } = useJoinModal();
  const headerBarRef = useRef<HTMLDivElement | null>(null);
  const [isRouteNavigationLoading, setIsRouteNavigationLoading] = useState(false);
  const [routeNavigationProgress, setRouteNavigationProgress] = useState(0);
  const [routeNavigationDirection, setRouteNavigationDirection] = useState<NavigationProgressDirection>("ltr");
  const routeNavigationAnimationFrameRef = useRef<number | null>(null);
  const routeNavigationAnimationStartRef = useRef(0);
  const routeNavigationResetTimeoutRef = useRef<number | null>(null);
  const routeNavigationFallbackTimeoutRef = useRef<number | null>(null);
  const routeNavigationStartPathnameRef = useRef<string>("/");
  const lastResolvedPathnameRef = useRef(pathname ?? "/");
  const isRouteNavigationLoadingRef = useRef(false);

  // TODO: revisit search state ownership (see backlog)
  useEffect(() => {
    if (!isJoinOpen) setSearch("");
  }, [isJoinOpen]);

  const resolveInternalPathname = useCallback((candidate: string | URL | null | undefined): string | null => {
    if (!candidate) return null;
    try {
      const nextUrl = candidate instanceof URL ? candidate : new URL(String(candidate), window.location.href);
      if (nextUrl.origin !== window.location.origin) return null;
      return nextUrl.pathname;
    } catch {
      return null;
    }
  }, []);

  const clearRouteNavigationAnimation = useCallback(() => {
    if (routeNavigationAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(routeNavigationAnimationFrameRef.current);
      routeNavigationAnimationFrameRef.current = null;
    }
    if (routeNavigationResetTimeoutRef.current !== null) {
      window.clearTimeout(routeNavigationResetTimeoutRef.current);
      routeNavigationResetTimeoutRef.current = null;
    }
    if (routeNavigationFallbackTimeoutRef.current !== null) {
      window.clearTimeout(routeNavigationFallbackTimeoutRef.current);
      routeNavigationFallbackTimeoutRef.current = null;
    }
  }, []);

  const startRouteNavigationProgress = useCallback((
    startPathname: string,
    direction: NavigationProgressDirection = "ltr"
  ) => {
    if (isRouteNavigationLoadingRef.current && routeNavigationStartPathnameRef.current === startPathname) {
      return;
    }
    clearRouteNavigationAnimation();
    routeNavigationStartPathnameRef.current = startPathname;
    setRouteNavigationDirection(direction);
    setIsRouteNavigationLoading(true);
    setRouteNavigationProgress(0);
    routeNavigationAnimationStartRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - routeNavigationAnimationStartRef.current;
      const nextProgress = Math.min(97, 97 * (1 - Math.exp(-elapsed / 950)));
      setRouteNavigationProgress(nextProgress);
      routeNavigationAnimationFrameRef.current = window.requestAnimationFrame(tick);
    };

    routeNavigationAnimationFrameRef.current = window.requestAnimationFrame(tick);
    routeNavigationFallbackTimeoutRef.current = window.setTimeout(() => {
      setIsRouteNavigationLoading(false);
      setRouteNavigationProgress(0);
      setRouteNavigationDirection("ltr");
      routeNavigationFallbackTimeoutRef.current = null;
      routeNavigationStartPathnameRef.current = window.location.pathname;
      if (routeNavigationAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(routeNavigationAnimationFrameRef.current);
        routeNavigationAnimationFrameRef.current = null;
      }
    }, 15000);
  }, [clearRouteNavigationAnimation]);

  const finishRouteNavigationProgress = useCallback(() => {
    clearRouteNavigationAnimation();
    setRouteNavigationProgress(100);
    routeNavigationResetTimeoutRef.current = window.setTimeout(() => {
      setIsRouteNavigationLoading(false);
      setRouteNavigationProgress(0);
      setRouteNavigationDirection("ltr");
      routeNavigationResetTimeoutRef.current = null;
      routeNavigationStartPathnameRef.current = window.location.pathname;
    }, 180);
  }, [clearRouteNavigationAnimation]);

  const startRouteNavigationForTarget = useCallback((candidate: string | URL, startPathname: string) => {
    const nextPathname = resolveInternalPathname(candidate);
    if (!nextPathname || nextPathname === startPathname) return;
    startRouteNavigationProgress(startPathname);
  }, [resolveInternalPathname, startRouteNavigationProgress]);


  useEffect(() => {
    lastResolvedPathnameRef.current = pathname ?? "/";
  }, [pathname]);

  useEffect(() => {
    isRouteNavigationLoadingRef.current = isRouteNavigationLoading;
  }, [isRouteNavigationLoading]);

  useEffect(() => {
    const handleNavigationProgressStart = () => {
      startRouteNavigationProgress(lastResolvedPathnameRef.current);
    };
    const handleNavigationProgressFinish = () => {
      finishRouteNavigationProgress();
    };

    window.addEventListener(NAVIGATION_PROGRESS_START_EVENT, handleNavigationProgressStart);
    window.addEventListener(NAVIGATION_PROGRESS_FINISH_EVENT, handleNavigationProgressFinish);
    return () => {
      window.removeEventListener(NAVIGATION_PROGRESS_START_EVENT, handleNavigationProgressStart);
      window.removeEventListener(NAVIGATION_PROGRESS_FINISH_EVENT, handleNavigationProgressFinish);
    };
  }, [finishRouteNavigationProgress, startRouteNavigationProgress]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const currentPathname = window.location.pathname;
      startRouteNavigationForTarget(anchor.href, currentPathname);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [startRouteNavigationForTarget]);

  useEffect(() => {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    const patchedPushState: History["pushState"] = function (data, unused, url) {
      const currentPathname = window.location.pathname;
      if (url) {
        const nextPathname = resolveInternalPathname(url);
        if (nextPathname && nextPathname !== currentPathname) {
          startRouteNavigationProgress(currentPathname);
        }
      }
      originalPushState.call(window.history, data, unused, url);
    };

    const patchedReplaceState: History["replaceState"] = function (data, unused, url) {
      const currentPathname = window.location.pathname;
      if (url) {
        const nextPathname = resolveInternalPathname(url);
        if (nextPathname && nextPathname !== currentPathname) {
          startRouteNavigationProgress(currentPathname);
        }
      }
      originalReplaceState.call(window.history, data, unused, url);
    };

    const handlePopState = () => {
      const previousPathname = lastResolvedPathnameRef.current;
      const nextPathname = window.location.pathname;
      if (nextPathname !== previousPathname) {
        startRouteNavigationProgress(previousPathname);
      }
    };

    window.history.pushState = patchedPushState;
    window.history.replaceState = patchedReplaceState;
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [resolveInternalPathname, startRouteNavigationProgress]);

  useEffect(() => {
    if (!isRouteNavigationLoading) return;
    if (pathname && pathname !== routeNavigationStartPathnameRef.current) {
      finishRouteNavigationProgress();
    }
  }, [finishRouteNavigationProgress, isRouteNavigationLoading, pathname]);

  useEffect(
    () => () => {
      clearRouteNavigationAnimation();
    },
    [clearRouteNavigationAnimation]
  );

  const isChromeFreeRoute = pathname === "/brief" || pathname === "/invest" || pathname === "/ns" || pathname?.startsWith("/ns/");
  if (isChromeFreeRoute) {
    return null;
  }

  return (
    <div
      data-global-header
      className="sticky top-0 z-[1200]"
    >
      <div className="w-full">
        <div
          ref={headerBarRef}
          className="relative flex items-stretch w-full border-x border-t border-gray-200/50"
          style={{ backgroundColor: "var(--color-background)" }}
        >
          {isRouteNavigationLoading && (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 bg-green-600/20"
                style={
                  routeNavigationDirection === "rtl"
                    ? { right: 0, left: "auto", width: `${routeNavigationProgress}%` }
                    : { left: 0, right: "auto", width: `${routeNavigationProgress}%` }
                }
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 h-[2px] bg-green-600 z-10"
                style={
                  routeNavigationDirection === "rtl"
                    ? { right: 0, left: "auto", width: `${routeNavigationProgress}%` }
                    : { left: 0, right: "auto", width: `${routeNavigationProgress}%` }
                }
              />
            </>
          )}

          <div className="h-12 flex items-center px-3 flex-shrink-0">
            <button
              onClick={() => {
                const host = window.location.hostname;
                const parts = host.split('.');
                const isLocalhost = parts[parts.length - 1].includes('localhost');
                const isSubdomain = (isLocalhost && parts.length >= 2 && parts[0] !== 'localhost') || (!isLocalhost && parts.length >= 3);
                if (isSubdomain) {
                  const mainDomain = isLocalhost ? parts.slice(1).join('.') : parts.slice(1).join('.');
                  const port = window.location.port ? ':' + window.location.port : '';
                  startRouteNavigationProgress(window.location.pathname, "rtl");
                  window.location.href = `${window.location.protocol}//${mainDomain}${port}/`;
                } else {
                  if (window.location.pathname !== "/") {
                    startRouteNavigationProgress(window.location.pathname, "rtl");
                  }
                  router.push("/");
                }
              }}
              className="font-bold text-lg text-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] whitespace-nowrap cursor-pointer"
            >
              Zcash.me/
            </button>
          </div>

          <div className="flex-1 min-w-0 h-12 border-l border-gray-200/50 relative">
            <ProfileSearchDropdown
              value={search}
              onChange={(v) => {
                if (typeof v === "object") {
                  const slug = buildSlug(v as Profile);
                  if (slug) {
                    (window as any).lastSelectionWasExplicit = true;
                    const host = window.location.hostname;
                    const hParts = host.split('.');
                    const isLH = hParts[hParts.length - 1].includes('localhost');
                    const isSub = (isLH && hParts.length >= 2 && hParts[0] !== 'localhost') || (!isLH && hParts.length >= 3);
                    const nextPath = `/${slug}`;
                    if (isSub) {
                      const mainDomain = hParts.slice(1).join('.');
                      const port = window.location.port ? ':' + window.location.port : '';
                      startRouteNavigationProgress(window.location.pathname);
                      window.location.href = `${window.location.protocol}//${mainDomain}${port}/${slug}`;
                    } else {
                      if (window.location.pathname !== nextPath) {
                        startRouteNavigationProgress(window.location.pathname);
                      }
                      router.push(nextPath);
                    }
                  }
                } else {
                  setSearch(v);
                }
              }}
              onClaimClick={(username: string) => {
                openJoin({ prefillUsername: username });
              }}
              dropdownContainerRef={headerBarRef}
              placeholder={profileCount > 1 ? `search ${profileCount} names` : "search names"}
              className="block w-full h-full min-w-0 px-3 py-[13px] text-sm leading-5 bg-transparent text-gray-800 placeholder-gray-400 outline-none"
            />
          </div>

          <div className="h-12 border-l border-gray-200/50 flex-shrink-0 flex items-center px-2">
            <motion.button
              onClick={() => {
                openJoin();
              }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.94, y: 1, filter: "brightness(0.95)" }}
              transition={{ type: "spring", stiffness: 550, damping: 24, mass: 0.35 }}
              className="h-8 rounded-md flex items-center justify-center bg-green-600 text-white px-4 text-sm font-semibold shadow-md whitespace-nowrap animate-joinPulse hover:shadow-[0_0_12px_rgba(34,197,94,0.7)] hover:bg-green-500"
            >
              Join
            </motion.button>
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(229,231,235,0) 0%, rgba(229,231,235,0.5) 36px, rgba(229,231,235,0.5) calc(100% - 36px), rgba(229,231,235,0) 100%)",
            }}
          />

        </div>
      </div>

    </div>
  );
}
