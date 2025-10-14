import { useEffect, useRef, useState } from "react";
export default function useAlphaVisibility(showDirectory) {
  const [showAlpha, setShowAlpha] = useState(false);
  const idleRef = useRef(null);
  useEffect(() => {
    const show = () => {
      setShowAlpha(true);
      if (idleRef.current) clearTimeout(idleRef.current);
      idleRef.current = setTimeout(() => setShowAlpha(false), 2800);
    };
    ["scroll", "wheel", "touchmove"].forEach(evt =>
      window.addEventListener(evt, show, { passive: true })
    );
    return () => {
      ["scroll", "wheel", "touchmove"].forEach(evt =>
        window.removeEventListener(evt, show)
      );
      if (idleRef.current) clearTimeout(idleRef.current);
    };
  }, [showDirectory]);
  return showAlpha;
}
