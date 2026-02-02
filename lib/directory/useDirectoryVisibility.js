import { useEffect, useRef, useState } from "react";

export function useDirectoryVisibility(initialShowDirectory = true) {
  const [showDirectory, setShowDirectory] = useState(initialShowDirectory);
  const [showDirLabel, setShowDirLabel] = useState(true);
  useEffect(() => {
    const handleCloseDir = () => setShowDirectory(false);
    window.addEventListener("closeDirectory", handleCloseDir);
    return () => window.removeEventListener("closeDirectory", handleCloseDir);
  }, []);
  useEffect(() => {
    if (!showDirectory) {
      setShowDirLabel(true);
      const t = setTimeout(() => setShowDirLabel(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showDirectory]);
  return { showDirectory, setShowDirectory, showDirLabel };
}

export function useAlphaVisibility(showDirectory) {
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
