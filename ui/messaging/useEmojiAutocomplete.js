import { useState, useRef } from "react";
import data from "@emoji-mart/data";
import { init, SearchIndex } from "emoji-mart";

init({ data });

export default function useEmojiAutocomplete({ textareaRef, value, setValue }) {
  const [results, setResults] = useState([]);
  const tokenRef = useRef(null);

  const update = async () => {
    const el = textareaRef?.current;
    if (!el) return setResults([]);
    const caret = el.selectionStart;
    const match = value.slice(0, caret).match(/(^|\s):([a-z0-9_+\-]+)$/i);
    if (!match) return setResults([]);
    const list = await SearchIndex.search(match[2]);
    tokenRef.current = { start: caret - match[0].length, end: caret };
    setResults(list.slice(0, 10).map((e) => ({ ch: e.skins?.[0]?.native || "", label: e.name || "" })));
  };

  const insert = (item) => {
    if (!tokenRef.current) return;
    const { start, end } = tokenRef.current;
    setValue(`${value.slice(0, start)}${item.ch} ${value.slice(end)}`);
    setResults([]);
  };

  return { results, insert, update, close: () => setResults([]) };
}
