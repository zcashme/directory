import {
  useState,
  useRef,
  useEffect,
  type RefObject,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import emojilib from "emojilib";

interface EmojiAutocompleteResult {
  ch: string;
  label: string;
}

interface UseEmojiAutocompleteOptions {
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  value: string;
  setValue: (value: string) => void;
}

type TokenRange = {
  start: number;
  end: number;
};

const emojiDictionary = emojilib as Record<string, string[]>;

export default function useEmojiAutocomplete({
  textareaRef,
  value,
  setValue,
}: UseEmojiAutocompleteOptions) {
  const [results, setResults] = useState<EmojiAutocompleteResult[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const tokenRef = useRef<TokenRange | null>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const choosePlacement = (
    triggerEl: HTMLElement | null,
    preferredMenuHeight = 208,
  ): "top" | "bottom" => {
    if (!triggerEl || typeof window === "undefined") return "bottom";
    const rect = triggerEl.getBoundingClientRect();
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;
    const spaceBelow = Math.max(0, viewportHeight - rect.bottom);
    const spaceAbove = Math.max(0, rect.top);

    if (spaceBelow >= preferredMenuHeight && spaceAbove >= preferredMenuHeight) {
      return "bottom";
    }
    if (spaceAbove > spaceBelow) return "top";
    return "bottom";
  };

  const update = () => {
    const el = textareaRef?.current;
    if (!el) {
      setResults([]);
      tokenRef.current = null;
      return;
    }
    const caret = el.selectionStart ?? el.value.length;
    const match = value.slice(0, caret).match(/(^|\s):([a-z0-9_+-]+)$/i);
    if (!match) {
      setResults([]);
      tokenRef.current = null;
      return;
    }

    const searchTerm = match[2].toLowerCase();
    const matches: EmojiAutocompleteResult[] = [];

    for (const [emoji, keywords] of Object.entries(emojiDictionary)) {
      for (const keyword of keywords) {
        if (keyword.toLowerCase().includes(searchTerm)) {
          matches.push({
            ch: emoji,
            label: keyword,
          });
          break;
        }
      }
    }

    tokenRef.current = { start: caret - match[0].length, end: caret };
    setResults(matches.slice(0, 10));
  };

  const insert = (item: EmojiAutocompleteResult) => {
    if (!tokenRef.current) return;
    const { start, end } = tokenRef.current;
    setValue(`${value.slice(0, start)}${item.ch} ${value.slice(end)}`);
    setResults([]);
    tokenRef.current = null;
    setHighlightedIndex(-1);
  };

  const insertHighlighted = () => {
    if (highlightedIndex < 0 || highlightedIndex >= results.length) return false;
    insert(results[highlightedIndex]);
    return true;
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && results.length > 0) {
      e.preventDefault();
      setResults([]);
      setHighlightedIndex(-1);
      return true;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (results.length === 0) return false;
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setHighlightedIndex((prev) => {
        const base = prev >= 0 ? prev : 0;
        return (base + delta + results.length) % results.length;
      });
      return true;
    }

    if (e.key === "Enter" && results.length > 0) {
      const didInsert = insertHighlighted();
      if (didInsert) {
        e.preventDefault();
      }
      return didInsert;
    }

    return false;
  };

  const setOptionRef = (index: number, el: HTMLButtonElement | null) => {
    optionRefs.current[index] = el;
  };

  useEffect(() => {
    optionRefs.current = [];
    if (results.length === 0) {
      setHighlightedIndex(-1);
      return;
    }

    setHighlightedIndex((prev) => {
      if (prev >= 0 && prev < results.length) return prev;
      return 0;
    });
  }, [results]);

  useEffect(() => {
    if (results.length === 0) return;

    const updatePlacement = () => {
      setPlacement(choosePlacement(textareaRef?.current ?? null, 208));
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);

    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [results.length, textareaRef]);

  useEffect(() => {
    if (highlightedIndex < 0) return;
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  return {
    results,
    insert,
    update,
    highlightedIndex,
    placement,
    setHighlightedIndex,
    setOptionRef,
    handleKeyDown,
    close: () => {
      setResults([]);
      setHighlightedIndex(-1);
      tokenRef.current = null;
    },
  };
}
