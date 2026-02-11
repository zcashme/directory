"use client";

import { useEffect } from "react";

/**
 * TEMPORARY MIGRATION COMPONENT — Remove after 1-2 releases.
 *
 * 1. Unregisters any legacy service workers left from previous builds.
 * 2. Guards against bfcache (back/forward cache) serving stale pages.
 *
 * Does NOT clear localStorage, sessionStorage, or IndexedDB.
 */
export default function LegacyServiceWorkerCleanup() {
    useEffect(() => {
        // --- Service Worker cleanup ---
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                registrations.forEach((r) => r.unregister());
            });
        }

        // --- bfcache guard ---
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                const alreadyReloaded = sessionStorage.getItem("bfcache_reload");
                if (!alreadyReloaded) {
                    sessionStorage.setItem("bfcache_reload", "true");
                    window.location.reload();
                } else {
                    sessionStorage.removeItem("bfcache_reload");
                }
            }
        };

        window.addEventListener("pageshow", handlePageShow);
        return () => window.removeEventListener("pageshow", handlePageShow);
    }, []);

    return null;
}
