import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useFloating, offset, flip, shift, size } from "@floating-ui/react";
import { getTextareaCaretCoords } from "@/lib/textareaCaret";
import data from "@emoji-mart/data";
import { init, SearchIndex } from "emoji-mart";

init({ data });

async function searchEmoji(query, limit = 14) {
  if (!query) return [];
  const results = await SearchIndex.search(query);
  return (results || []).slice(0, limit).map((emoji) => ({
    ch: emoji.skins?.[0]?.native || "",
    label: emoji.name || "",
    shortcodes: emoji.shortcodes || [emoji.id],
  }));
}

export default function useEmojiAutocomplete({
  textareaRef,
  value,
  setValue,
  enabled = true,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [query, setQuery] = useState("");

  const tokenRef = useRef(null);
  const valueRef = useRef(value);

  const { floatingStyles, refs, update } = useFloating({
    open: isOpen,
    placement: "bottom-start",
    middleware: [
      offset(8),
      flip({ fallbackPlacements: ["top-start"] }),
      shift({ padding: 12 }),
      size({ padding: 12, apply({ availableWidth, elements }) {
        Object.assign(elements.floating.style, { maxWidth: `${Math.min(360, availableWidth)}px` });
      } }),
    ],
  });

  useEffect(() => { valueRef.current = value; }, [value]);

  const closePopover = useCallback(() => {
    setIsOpen(false);
    setResults([]);
    setActiveIndex(0);
    setQuery("");
    tokenRef.current = null;
  }, []);

  const updateSuggestions = useDebouncedCallback(async (nextValue) => {
    if (!enabled) return closePopover();

    const el = textareaRef?.current;
    if (!el || el.selectionStart !== el.selectionEnd) return closePopover();

    const caret = el.selectionStart;
    const text = nextValue ?? valueRef.current ?? "";
    const textBefore = text.slice(0, caret);
    const match = textBefore.match(/(^|\s):([a-z0-9_+\-]{0,32})$/i);
    if (!match) return closePopover();

    const rawQuery = match[2] || "";
    const list = await searchEmoji(rawQuery, 14);
    if (!list.length) return closePopover();

    // Update virtual element position for floating-ui
    const caretCoords = getTextareaCaretCoords(el, caret);
    const textareaRect = el.getBoundingClientRect();
    refs.setPositionReference({
      getBoundingClientRect: () => ({
        x: textareaRect.left + caretCoords.left,
        y: textareaRect.top + caretCoords.top,
        width: 0,
        height: caretCoords.height,
        top: textareaRect.top + caretCoords.top,
        left: textareaRect.left + caretCoords.left,
        right: textareaRect.left + caretCoords.left,
        bottom: textareaRect.top + caretCoords.top + caretCoords.height,
      }),
    });

    const queryChanged = rawQuery !== tokenRef.current?.rawQuery;
    tokenRef.current = { start: textBefore.length - rawQuery.length - 1, end: caret, rawQuery };
    setResults(list);
    if (queryChanged) setActiveIndex(0);
    setQuery(rawQuery);
    setIsOpen(true);
    requestAnimationFrame(() => update());
  }, 35);

  const insertAtIndex = useCallback((index) => {
    const token = tokenRef.current;
    const el = textareaRef?.current;
    const item = results[index];
    if (!token || !el || !item) return;

    const text = valueRef.current || "";
    const before = text.slice(0, token.start);
    const after = text.slice(token.end);
    setValue(`${before}${item.ch} ${after}`);
    closePopover();

    const nextPos = before.length + item.ch.length + 1;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextPos, nextPos);
    });
  }, [closePopover, results, setValue, textareaRef]);

  const handleKeyDown = useCallback((ev) => {
    if (!isOpen) return;
    const handlers = {
      ArrowDown: () => setActiveIndex((i) => Math.min(i + 1, results.length - 1)),
      ArrowUp: () => setActiveIndex((i) => Math.max(i - 1, 0)),
      Enter: () => insertAtIndex(activeIndex),
      Tab: () => insertAtIndex(activeIndex),
      Escape: closePopover,
    };
    if (handlers[ev.key]) {
      ev.preventDefault();
      handlers[ev.key]();
    }
  }, [activeIndex, closePopover, insertAtIndex, isOpen, results.length]);

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
    floatingStyles,
    floatingRef: refs.setFloating,
    setActiveIndex,
    insertAtIndex,
    handleKeyDown,
    handleInput: updateSuggestions,
    handleClick: updateSuggestions,
    handleBlur,
  };
}
