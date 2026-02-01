import { useCallback, useEffect, useRef, useState } from "react";
import { getTextareaCaretCoords } from "@/lib/textareaCaret";

const EMOJIBASE_COMPACT_URL =
  "https://cdn.jsdelivr.net/npm/emojibase-data@latest/en/compact.json";
const CACHE_KEY = "emojibase_en_compact_v2";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const DISCORD_ALIASES = {
  pray: {
    prefer: ["folded_hands"],
    extra: ["please", "thanks", "thank you", "namaste", "gratitude"],
  },
  laugh: {
    prefer: ["face_with_tears_of_joy", "rolling_on_the_floor_laughing"],
    extra: ["lol", "lmao", "funny", "tear", "tears", "laughter"],
  },
  heart: {
    prefer: ["red_heart"],
    extra: ["love", "like"],
  },
};

const FALLBACK_EMOJI = [
  { emoji: "🙏", annotation: "Folded Hands", shortcodes: ["folded_hands", "pray"] },
  { emoji: "👍", annotation: "Thumbs Up", shortcodes: ["thumbsup", "+1"] },
  { emoji: "🔥", annotation: "Fire", shortcodes: ["fire", "lit"] },
  { emoji: "❤️", annotation: "Red Heart", shortcodes: ["red_heart", "heart"] },
  { emoji: "😂", annotation: "Face With Tears of Joy", shortcodes: ["joy"] },
  { emoji: "😄", annotation: "Smiling Face", shortcodes: ["smile"] },
  { emoji: "🎉", annotation: "Party Popper", shortcodes: ["tada", "party"] },
  { emoji: "✅", annotation: "Check Mark Button", shortcodes: ["white_check_mark"] },
];

let EMOJI_INDEX = null;
let EMOJI_LOAD = null;

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function slugifyToShortcode(label) {
  const n = normalize(label)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return n || "emoji";
}

function pickChar(item) {
  return item.emoji || item.unicode || item.character || item.symbol || "";
}

function pickLabel(item) {
  return item.annotation || item.label || item.name || item.description || "";
}

function buildIndexFromEmojibase(compactArray) {
  const out = [];

  function pushEntry(raw) {
    const ch = pickChar(raw);
    if (!ch) return;

    const label = pickLabel(raw) || "Emoji";
    const tags = Array.isArray(raw.tags) ? raw.tags : [];
    let shortcodes = Array.isArray(raw.shortcodes) ? raw.shortcodes.slice() : [];

    if (shortcodes.length === 0) shortcodes = [slugifyToShortcode(label)];

    const normLabel = normalize(label);
    const normSc = shortcodes.map(normalize);
    const normTags = tags.map(normalize);
    const allText = [normLabel, ...normSc, ...normTags].join(" ");

    out.push({
      ch,
      label,
      shortcodes,
      tags,
      _label: normLabel,
      _sc: normSc,
      _tags: normTags,
      _allText: allText,
    });
  }

  for (const item of compactArray) {
    if (!item) continue;
    pushEntry(item);
    if (Array.isArray(item.skins)) {
      for (const skin of item.skins) {
        if (!skin) continue;
        pushEntry({
          ...item,
          ...skin,
          annotation: pickLabel(skin) || pickLabel(item),
          tags: Array.isArray(skin.tags)
            ? skin.tags
            : Array.isArray(item.tags)
              ? item.tags
              : [],
          shortcodes: Array.isArray(skin.shortcodes)
            ? skin.shortcodes
            : Array.isArray(item.shortcodes)
              ? item.shortcodes
              : [],
        });
      }
    }
  }

  return out;
}

function getCachedDataset() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.ts || !parsed.data) return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedDataset(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

async function loadEmojiIndex() {
  if (EMOJI_INDEX) return EMOJI_INDEX;
  if (EMOJI_LOAD) return EMOJI_LOAD;

  EMOJI_LOAD = (async () => {
    try {
      const cached = typeof window !== "undefined" ? getCachedDataset() : null;
      if (cached) {
        EMOJI_INDEX = buildIndexFromEmojibase(cached);
        return EMOJI_INDEX;
      }

      const res = await fetch(EMOJIBASE_COMPACT_URL, { cache: "force-cache" });
      if (!res.ok) throw new Error("Failed to fetch emoji dataset");
      const data = await res.json();
      if (typeof window !== "undefined") setCachedDataset(data);
      EMOJI_INDEX = buildIndexFromEmojibase(data);
      return EMOJI_INDEX;
    } catch {
      EMOJI_INDEX = buildIndexFromEmojibase(FALLBACK_EMOJI);
      return EMOJI_INDEX;
    }
  })();

  return EMOJI_LOAD;
}

function getAliasConfig(q) {
  const nq = normalize(q);
  return DISCORD_ALIASES[nq] || null;
}

function expandedTerms(q) {
  const nq = normalize(q);
  const alias = getAliasConfig(nq);
  const terms = new Set([nq]);

  if (alias?.extra) {
    for (const t of alias.extra) terms.add(normalize(t));
  }

  if (nq.includes("_")) terms.add(nq.replaceAll("_", " "));
  if (nq.includes(" ")) terms.add(nq.replaceAll(" ", "_"));

  return [...terms].filter(Boolean);
}

function searchEmoji(q, limit = 14) {
  if (!EMOJI_INDEX || !EMOJI_INDEX.length) return [];
  const nq = normalize(q);
  if (!nq) return EMOJI_INDEX.slice(0, limit);

  const alias = getAliasConfig(nq);
  const terms = expandedTerms(nq);
  const preferred = new Set((alias?.prefer || []).map(normalize));

  const scored = [];
  for (const e of EMOJI_INDEX) {
    let score = 0;

    for (const sc of e._sc) {
      if (sc.startsWith(nq)) score = Math.max(score, 130 - (sc.length - nq.length));
      else if (sc.includes(nq)) score = Math.max(score, 95 - (sc.length - nq.length));
    }

    if (e._label.includes(nq)) score = Math.max(score, 80);
    for (const t of e._tags) {
      if (t.startsWith(nq)) score = Math.max(score, 85);
      else if (t.includes(nq)) score = Math.max(score, 60);
    }

    for (const term of terms) {
      if (term === nq) continue;
      if (e._label.includes(term)) score = Math.max(score, 65);
      for (const t of e._tags) {
        if (t.includes(term)) score = Math.max(score, 55);
      }
    }

    if (preferred.size) {
      const hasPreferred = e._sc.some((sc) => preferred.has(sc));
      if (hasPreferred) score += 500;
    }

    if (score > 0) scored.push({ e, score });
  }

  scored.sort((a, b) => b.score - a.score || a.e.label.localeCompare(b.e.label));
  return scored.slice(0, limit).map((x) => x.e);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function useEmojiAutocomplete({
  textareaRef,
  containerRef,
  value,
  setValue,
  enabled = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState({ left: 12, top: 12 });

  const tokenRef = useRef(null);
  const debounceRef = useRef(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    loadEmojiIndex().then(() => {
      if (mounted) {
        setResults((prev) => prev);
      }
    });
    return () => {
      mounted = false;
    };
  }, [enabled]);

  const closePopover = useCallback(() => {
    setIsOpen(false);
    setResults([]);
    setActiveIndex(0);
    setQuery("");
    tokenRef.current = null;
  }, []);

  const updateSuggestions = useCallback(
    (nextValue) => {
      if (!enabled) {
        closePopover();
        return;
      }
      const el = textareaRef?.current;
      const containerEl = containerRef?.current || el?.parentElement;
      if (!el || !containerEl) {
        closePopover();
        return;
      }

      if (el.selectionStart == null || el.selectionEnd == null) {
        closePopover();
        return;
      }

      if (el.selectionStart !== el.selectionEnd) {
        closePopover();
        return;
      }

      const caret = el.selectionStart;
      const text = (nextValue ?? valueRef.current) || "";
      const textBefore = text.slice(0, caret);
      const match = textBefore.match(/(^|\s):([a-z0-9_+\-]{0,32})$/i);
      if (!match) {
        closePopover();
        return;
      }

      const rawQuery = match[2] || "";
      const tokenStart = textBefore.length - rawQuery.length - 1;
      const list = searchEmoji(rawQuery, 14);
      if (!list.length) {
        closePopover();
        return;
      }

      tokenRef.current = { start: tokenStart, end: caret, rawQuery };
      setResults(list);
      setActiveIndex(0);
      setQuery(rawQuery);
      setIsOpen(true);

      const caretCoords = getTextareaCaretCoords(el, caret);
      const containerRect = containerEl.getBoundingClientRect();
      const textareaRect = el.getBoundingClientRect();

      const leftRaw = textareaRect.left - containerRect.left + caretCoords.left;
      const topRaw =
        textareaRect.top - containerRect.top + caretCoords.top + caretCoords.height + 8;

      const widthHint = 360;
      const maxLeft = Math.max(12, containerRect.width - widthHint - 12);
      const left = clamp(leftRaw, 12, maxLeft);

      let top = clamp(topRaw, 12, Math.max(12, containerRect.height - 140));
      if (topRaw + 240 > containerRect.height) {
        top = clamp(
          textareaRect.top - containerRect.top + caretCoords.top - 220,
          12,
          Math.max(12, containerRect.height - 140)
        );
      }

      setPosition({ left, top });
    },
    [closePopover, containerRef, enabled, textareaRef]
  );

  const scheduleUpdate = useCallback(
    (nextValue) => {
      if (!enabled) return;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => updateSuggestions(nextValue), 35);
    },
    [enabled, updateSuggestions]
  );

  const insertAtIndex = useCallback(
    (index) => {
      const token = tokenRef.current;
      const el = textareaRef?.current;
      if (!token || !el) return;

      const item = results[index];
      if (!item) return;

      const text = valueRef.current || "";
      const before = text.slice(0, token.start);
      const after = text.slice(token.end);
      const next = `${before}${item.ch} ${after}`;

      setValue(next);
      closePopover();

      const nextPos = before.length + item.ch.length + 1;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(nextPos, nextPos);
      });
    },
    [closePopover, results, setValue, textareaRef]
  );

  const handleKeyDown = useCallback(
    (ev) => {
      if (!isOpen) return;
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        setActiveIndex((prev) => clamp(prev + 1, 0, results.length - 1));
        return;
      }
      if (ev.key === "ArrowUp") {
        ev.preventDefault();
        setActiveIndex((prev) => clamp(prev - 1, 0, results.length - 1));
        return;
      }
      if (ev.key === "Enter" || ev.key === "Tab") {
        ev.preventDefault();
        insertAtIndex(activeIndex);
        return;
      }
      if (ev.key === "Escape") {
        ev.preventDefault();
        closePopover();
      }
    },
    [activeIndex, closePopover, insertAtIndex, isOpen, results.length]
  );

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (document.activeElement !== textareaRef?.current) closePopover();
    }, 120);
  }, [closePopover, textareaRef]);

  return {
    isOpen,
    results,
    activeIndex,
    query,
    position,
    setActiveIndex,
    insertAtIndex,
    handleKeyDown,
    handleInput: scheduleUpdate,
    handleClick: scheduleUpdate,
    handleBlur,
  };
}
