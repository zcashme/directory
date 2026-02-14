import { useMemo, useRef, useEffect, useState } from "react";
import useEmojiAutocomplete from "@/ui/messaging/useEmojiAutocomplete";

interface MemoCounterProps {
  text: string;
}

function MemoCounter({ text }: MemoCounterProps) {
  const bytes = useMemo(() => new TextEncoder().encode(text || "").length, [text]);
  const over = bytes > 512;
  const diff = over ? bytes - 512 : 512 - bytes;

  return (
    <span className={`absolute bottom-3 right-3 text-md ${over ? "text-red-600" : "text-gray-400"}`}>
      {over ? `Over by ${diff} bytes` : `${diff} bytes left`}
    </span>
  );
}

interface ThreadComposerProps {
  onSubmit: (content: string) => Promise<void>;
  disabled?: boolean;
  boardName?: string;
}

export function ThreadComposer({
  onSubmit,
  disabled = false,
  boardName = "Board",
}: ThreadComposerProps) {
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const emoji = useEmojiAutocomplete({
    textareaRef,
    value: memo,
    setValue: setMemo,
  }) as {
    results: Array<{ ch: string; label: string }>;
    insert: (_item: { ch: string; label: string }) => void;
    update: () => void;
    close: () => void;
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [memo]);

  const handleSubmit = async () => {
    if (!memo.trim() || isSubmitting || disabled) return;

    setIsSubmitting(true);
    try {
      await onSubmit(memo);
      setMemo("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Failed to post message:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-[#faf6ed] border border-gray-300 rounded-lg p-4 mb-6">
      <div className="mb-3">
        <label className="text-sm font-semibold text-gray-900">
          Post to {boardName}
        </label>
      </div>

      {/* MEMO FIELD */}
      <div className="relative mb-4">
        <div className="absolute left-3 top-2 pointer-events-none text-gray-500 text-md">
          ✎
        </div>

        <textarea
          ref={textareaRef}
          rows={3}
          value={memo}
          disabled={disabled || isSubmitting}
          onChange={(e) => {
            const el = e.target;
            setMemo(el.value);
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
            emoji.update();
          }}
          onKeyDown={handleKeyDown}
          onBlur={emoji.close}
          placeholder={`Write your message here... (Cmd+Enter to post)`}
          className={`border border-gray-800 px-3 py-2 rounded-xl w-full text-md resize-none pl-8 text-gray-700 focus:ring-1 focus:ring-blue-500 ${
            disabled || isSubmitting ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""
          }`}
        />

        {emoji.results.length > 0 && (
          <div className="absolute top-full left-0 mt-1 z-50 w-[240px] rounded-lg border border-gray-200 bg-[#faf6ed] shadow-lg max-h-48 overflow-auto">
            {emoji.results.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-50"
                onMouseDown={(e) => {
                  e.preventDefault();
                  emoji.insert(item);
                }}
              >
                <span className="text-lg">{item.ch}</span>
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {memo && (
          <button
            onClick={() => setMemo("")}
            className="absolute right-3 top-1 text-gray-400 hover:text-gray-600"
          >
            ⌫
          </button>
        )}

        <MemoCounter text={memo} />
      </div>
    </div>
  );
}
