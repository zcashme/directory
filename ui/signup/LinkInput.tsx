import { useState, useEffect } from "react";
import { isValidUrl } from "@/lib/validation/validators";
import Alert from "@/ui/common/feedback/Alert";
import { withFieldBorderState } from "@/ui/common/forms/styles";

const BASE_FIELD_CLASS =
  "w-full rounded-2xl border px-3 py-1.5 text-sm font-mono bg-transparent outline-hidden text-gray-800 placeholder-gray-400";

interface LinkInputProps {
  value: string;
  onChange: (_value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  showValidation?: boolean;
  containerClassName?: string;
  inputClassName?: string;
}

export default function LinkInput({
  value,
  onChange,
  readOnly = false,
  placeholder = "",
  showValidation = true,
  containerClassName = "",
  inputClassName = "",
}: LinkInputProps) {
  const [valid, setValid] = useState(true);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setValid(true);
      setReason(null);
      return;
    }
    const res = isValidUrl(value.trim());
    setValid(res.valid);
    setReason(res.reason || null);
  }, [value]);

  return (
    <div className={`w-full ${containerClassName}`.trim()}>
      <input
        type="url"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className={`${BASE_FIELD_CLASS} ${
          readOnly
            ? "bg-gray-100 text-gray-500 cursor-not-allowed border-[#0a1126]/40"
            : withFieldBorderState("border-[#0a1126]/60", !valid)
        } ${inputClassName}`}
      />
      {/* error message */}
      {showValidation && !valid && reason && (
        <Alert variant="error" size="sm" message={reason} className="mt-1" />
      )}

      {/* info-level message (tracking params, normalizable hints) */}
      {showValidation && valid && reason && (
        <p className="text-xs text-blue-600 mt-1">{reason}</p>
      )}
    </div>
  );
}
