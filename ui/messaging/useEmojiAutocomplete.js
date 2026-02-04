import { useCallback, useEffect, useRef, useState } from "react";
import { getTextareaCaretCoords } from "@/lib/textareaCaret";
import data from "@emoji-mart/data";
import { init, SearchIndex } from "emoji-mart";

// Initialize emoji-mart data once
init({ data });

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

async function searchEmoji(query, limit = 14) {
  if (!query) {
    // Return some common emojis when no query
    const defaults = ["thumbsup", "heart", "fire", "smile", "pray", "100", "eyes", "rocket"];
    const results = [];
    for (const id of defaults) {
      const found = await SearchIndex.search(id);
      if (found?.[0]) results.push(found[0]);
      if (results.length >= limit) break;
    }
    return results.map(formatEmoji);
  }

  const results = await SearchIndex.search(query);
  return (results || []).slice(0, limit).map(formatEmoji);
}

function formatEmoji(emoji) {
  return {
    ch: emoji.skins?.[0]?.native || "",
    label: emoji.name || "",
    shortcodes: emoji.shortcodes || [emoji.id],
  };
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

  const closePopover = useCallback(() => {
    setIsOpen(false);
    setResults([]);
    setActiveIndex(0);
    setQuery("");
    tokenRef.current = null;
  }, []);

  const updateSuggestions = useCallback(
    async (nextValue) => {
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
      const list = await searchEmoji(rawQuery, 14);
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
