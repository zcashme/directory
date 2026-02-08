import { useState, useRef } from "react";
import emojilib from "emojilib";

export default function useEmojiAutocomplete({ textareaRef, value, setValue }) {
  const [results, setResults] = useState([]);
  const tokenRef = useRef(null);

  const update = () => {
    const el = textareaRef?.current;
    if (!el) return setResults([]);
    const caret = el.selectionStart;
    const match = value.slice(0, caret).match(/(^|\s):([a-z0-9_+-]+)$/i);
    if (!match) return setResults([]);

    const searchTerm = match[2].toLowerCase();
    const matches = [];

    // Search through emojilib for matching emojis
    for (const [emoji, keywords] of Object.entries(emojilib)) {
      for (const keyword of keywords) {
        if (keyword.toLowerCase().includes(searchTerm)) {
          matches.push({
            ch: emoji,
            label: keyword,
          });
          break; // Only use first matching keyword for each emoji
        }
      }
    }

    tokenRef.current = { start: caret - match[0].length, end: caret };
    setResults(matches.slice(0, 10));
  };

  const insert = (item) => {
    if (!tokenRef.current) return;
    const { start, end } = tokenRef.current;
    setValue(`${value.slice(0, start)}${item.ch} ${value.slice(end)}`);
    setResults([]);
  };

  return { results, insert, update, close: () => setResults([]) };
}
