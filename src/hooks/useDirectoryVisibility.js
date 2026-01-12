import { useEffect, useState } from "react";
export default function useDirectoryVisibility(initialShowDirectory = true) {
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
