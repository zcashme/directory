import { useState, useRef, useEffect } from "react";

const memoryCache = new Map();

export default function useLazyVisible(finalUrl, fullView) {
  const imgRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (fullView || memoryCache.has(finalUrl)) {
      setVisible(true);
      return;
    }

    const el = imgRef.current;
    if (!el || !finalUrl) {
      setVisible(true);
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            memoryCache.set(finalUrl, true);
            obs.disconnect();
          }
        });
      },
      { rootMargin: "200px", threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [finalUrl, fullView]);

  return { imgRef, visible };
}
