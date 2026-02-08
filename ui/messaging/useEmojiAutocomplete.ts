import { useState, useRef, type RefObject } from "react";
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
  const tokenRef = useRef<TokenRange | null>(null);

  const update = () => {
    const el = textareaRef?.current;
    if (!el) {
      setResults([]);
      return;
    }
    const caret = el.selectionStart ?? el.value.length;
    const match = value.slice(0, caret).match(/(^|\s):([a-z0-9_+-]+)$/i);
    if (!match) {
      setResults([]);
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
  };

  return {
    results,
    insert,
    update,
    close: () => setResults([]),
  };
}
