"use client";

import { useCallback, useState } from "react";

export function linkAuthKey(link: { id?: number | null; url?: string }): string {
  if (Number.isSafeInteger(link.id) && Number(link.id) > 0) return `id:${link.id}`;
  return `url:${link.url ?? ""}`;
}

export default function useExclusiveLinkExpand() {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const toggle = useCallback((key: string) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  }, []);
  return { expandedKey, toggle };
}
