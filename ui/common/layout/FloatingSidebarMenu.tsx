"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { animate, motion, useDragControls, useMotionValue } from "framer-motion";
import type { PanInfo } from "framer-motion";

interface FloatingSidebarItem {
  href: string | null;
  localHref?: string;
  label: string;
  description: string;
  comingSoon?: boolean;
}

const SIDEBAR_MENU_ITEMS: FloatingSidebarItem[] = [
  { href: "https://status.zcash.me", localHref: "/stats-app", label: "Status Page", description: "See live uptime and incident reports", comingSoon: true },
  { href: "https://leaders.zcash.me", localHref: "/leader-app", label: "Leaders", description: "Top profiles by referral activity", comingSoon: true },
  { href: null, label: "Statistics", description: "Platform metrics and growth", comingSoon: true },
  { href: null, label: "Polls", description: "Vote and voice your opinion", comingSoon: true },
  { href: null, label: "News", description: "Announcements and updates", comingSoon: true },
  { href: null, label: "Map", description: "Find others in your region", comingSoon: true },
  { href: null, label: "Forum", description: "Discuss ideas", comingSoon: true },
  { href: null, label: "App", description: "Enjoy our full-featured mobile experience", comingSoon: true },
];

export default function FloatingSidebarMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [headerOffsetPx, setHeaderOffsetPx] = useState<number>(0);
  const menuWidthRef = useRef<number>(typeof window !== "undefined"
    ? Math.round(window.innerWidth < 768
      ? Math.min(Math.max(window.innerWidth * 0.86, 300), 420)
      : Math.min(Math.max(window.innerWidth * 0.33, 360), 520))
    : 520);
  const tabRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const panelX = useMotionValue(-menuWidthRef.current);
  const dragControls = useDragControls();
  const isOpenRef = useRef(false);

  const resolveDestination = useCallback((item: FloatingSidebarItem) => {
    if (!item.href) return null;
    if (typeof window === "undefined") return item.href;

    const host = window.location.hostname.toLowerCase();
    const isLocalhost = host === "localhost" || host === "127.0.0.1" || host === "::1";

    if (isLocalhost && item.localHref) return item.localHref;
    return item.href;
  }, []);

  const openMenu = useCallback(() => {
    isOpenRef.current = true;
    setIsOpen(true);
    setHighlightedIndex((prev) => (prev >= 0 ? prev : 0));
  }, []);

  const closeMenu = useCallback((returnFocus = true) => {
    isOpenRef.current = false;
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (returnFocus) tabRef.current?.focus();
  }, []);

  const selectAtIndex = useCallback(
    (index: number) => {
      const item = SIDEBAR_MENU_ITEMS[index];
      if (!item || !item.href || item.comingSoon) return;
      const destination = resolveDestination(item);
      if (!destination) return;

      if (/^https?:\/\//i.test(destination)) {
        window.location.assign(destination);
      } else {
        router.push(destination);
      }
      closeMenu(false);
    },
    [closeMenu, resolveDestination, router]
  );

  useEffect(() => {
    if (!isOpen || highlightedIndex < 0) return;
    itemRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [isOpen, highlightedIndex]);

  useEffect(() => {
    const controls = animate(panelX, isOpen ? 0 : -menuWidthRef.current, {
      type: "spring",
      stiffness: 520,
      damping: 34,
      mass: 0.7,
    });
    return () => controls.stop();
  }, [isOpen, panelX]);

  useEffect(() => {
    const updateLayout = () => {
      const viewportWidth = window.innerWidth;
      const headerEl = document.querySelector("[data-global-header]") as HTMLElement | null;
      const headerHeight = headerEl?.getBoundingClientRect().height ?? 0;
      const targetWidth = viewportWidth < 768
        ? Math.round(Math.min(Math.max(viewportWidth * 0.86, 300), 420))
        : Math.round(Math.min(Math.max(viewportWidth * 0.33, 360), 520));

      menuWidthRef.current = targetWidth;
      if (panelRef.current) panelRef.current.style.width = `${targetWidth}px`;
      panelX.set(isOpenRef.current ? 0 : -targetWidth);
      setHeaderOffsetPx(headerHeight);
      setIsMobile(viewportWidth < 768);
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, [panelX]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: Event) => {
      if (!containerRef.current?.contains(event.target as Node)) closeMenu(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [closeMenu, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [closeMenu, isOpen]);

  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();

    if (!isOpen) {
      openMenu();
      return;
    }

    if (event.key === " ") return;

    if (event.key === "Enter" && highlightedIndex >= 0) {
      selectAtIndex(highlightedIndex);
      return;
    }

    const delta = event.key === "ArrowDown" ? 1 : -1;
    setHighlightedIndex((prev) => {
      const base = prev >= 0 ? prev : 0;
      return (base + delta + SIDEBAR_MENU_ITEMS.length) % SIDEBAR_MENU_ITEMS.length;
    });
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Enter") return;
    event.preventDefault();

    if (event.key === "Enter" && highlightedIndex >= 0) {
      selectAtIndex(highlightedIndex);
      return;
    }

    const delta = event.key === "ArrowDown" ? 1 : -1;
    setHighlightedIndex((prev) => {
      const base = prev >= 0 ? prev : 0;
      return (base + delta + SIDEBAR_MENU_ITEMS.length) % SIDEBAR_MENU_ITEMS.length;
    });
  };

  const handlePanelDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!isMobile) return;

    if (!isOpen) {
      if (info.offset.x > 32 || info.velocity.x > 220) {
        openMenu();
        return;
      }
      closeMenu(false);
      return;
    }

    if (info.offset.x < -40 || info.velocity.x < -250) {
      closeMenu(false);
      return;
    }

    openMenu();
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar menu"
          onClick={() => closeMenu(false)}
          className="fixed inset-0 z-[1190] bg-black/20"
        />
      )}

      <div ref={containerRef} className="pointer-events-none fixed left-0 z-[1200]" style={{ top: headerOffsetPx, bottom: 0 }}>
        <motion.div
          ref={panelRef}
          style={{ x: panelX, width: menuWidthRef.current, touchAction: "pan-y", willChange: "transform" }}
          drag={isMobile ? "x" : false}
          dragListener={isOpen}
          dragControls={dragControls}
          dragConstraints={{ left: -menuWidthRef.current, right: 0 }}
          dragElastic={0.06}
          dragMomentum={false}
          onDragEnd={handlePanelDragEnd}
          className="pointer-events-auto relative h-full"
        >
          <div
            id="floating-sidebar-menu"
            role="menu"
            onKeyDown={handleMenuKeyDown}
            className="h-full w-full overflow-hidden rounded-r-3xl rounded-l-none border border-l-0 border-gray-200 shadow-2xl"
            style={{
              pointerEvents: isOpen ? "auto" : "none",
              backgroundColor: "var(--color-background)",
              opacity: isOpen ? 1 : 0.96,
              transition: "opacity 0.15s ease-out",
            }}
          >
            <div className="px-6 pt-6 pb-4 border-b border-gray-200">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Navigation</p>
            </div>
            <div className="flex h-[calc(100%-57px)] min-h-0 flex-col">
              {SIDEBAR_MENU_ITEMS.map((item, index) => {
                const isRowActive = highlightedIndex === index;
                return (
                  <button
                    key={item.href ?? item.label}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    role="menuitem"
                    type="button"
                    onClick={() => selectAtIndex(index)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onFocus={() => setHighlightedIndex(index)}
                    className={`group flex-1 min-h-0 w-full px-7 py-2 text-left transition-colors ${
                      isRowActive
                        ? "bg-[var(--color-brand-blue)]/90 text-white"
                        : "text-gray-700 hover:bg-[var(--color-brand-blue)]/90 hover:text-white"
                    }`}
                    disabled={item.comingSoon}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="block min-w-0 truncate font-semibold leading-tight tracking-tight"
                        style={{ fontSize: "clamp(1rem, 0.9rem + 1vh, 2rem)" }}
                      >
                        {item.label}
                      </span>
                      {item.comingSoon && (
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          isRowActive
                            ? "border-white/80 text-white"
                            : "border-gray-300 text-gray-500 group-hover:border-white group-hover:text-white"
                        }`}>
                          Coming Soon
                        </span>
                      )}
                    </span>
                    <span
                      className={`mt-0.5 block truncate text-xs md:text-sm ${
                        isRowActive ? "text-white" : "text-gray-500 group-hover:text-white"
                      }`}
                    >
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            ref={tabRef}
            type="button"
            onClick={() => (isOpen ? closeMenu(false) : openMenu())}
            onKeyDown={handleTabKeyDown}
            onPointerDown={(event) => {
              if (isMobile && !isOpen) dragControls.start(event);
            }}
            aria-expanded={isOpen}
            aria-controls="floating-sidebar-menu"
            aria-label="Open quick navigation menu"
            className="absolute right-0 top-1/2 h-24 w-8 translate-x-full -translate-y-1/2 border border-l-0 border-gray-200 rounded-r-2xl text-gray-600 shadow-sm transition-colors hover:text-gray-900"
            style={{ pointerEvents: "auto", backgroundColor: "var(--color-background)", touchAction: "pan-y" }}
          >
            <span className="flex items-center justify-center">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M7 6.5H10V3.5H7V6.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 6.5H17V3.5H14V6.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 13.5H10V10.5H7V13.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 13.5H17V10.5H14V13.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 20.5H10V17.5H7V20.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 20.5H17V17.5H14V20.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        </motion.div>
      </div>
    </>
  );
}
