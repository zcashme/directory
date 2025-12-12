// File: src/components/LinkInput.jsx
import { useState, useEffect } from "react";
import { isValidUrl } from "../utils/validateUrl";

const BASE_FIELD_CLASS =
  "w-full rounded-2xl border px-3 py-1.5 text-sm font-mono bg-transparent outline-none text-gray-800 placeholder-gray-400";


export default function LinkInput({ value, onChange, readOnly = false, placeholder = "" }) {
const [valid, setValid] = useState(true);
const [reason, setReason] = useState(null);

useEffect(() => {
  if (!value) {
    setValid(true);
    setReason(null);
    return;
  }
  const res = isValidUrl(value.trim());
  setValid(res.valid);
  setReason(res.reason);
}, [value]);


  return (
    <div className="w-full">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className={`${BASE_FIELD_CLASS} ${
          readOnly
            ? "bg-gray-100 text-gray-500 cursor-not-allowed border-[#0a1126]/40"
            : valid
            ? "border-[#0a1126]/60 focus:border-blue-500"
            : "border-red-400 focus:border-red-500"
        }`}

      />
{/* error message */}
{!valid && reason && (
  <p className="text-xs text-red-600 mt-1">{reason}</p>
)}

{/* info-level message (tracking params, normalizable hints) */}
{valid && reason && (
  <p className="text-xs text-blue-600 mt-1">{reason}</p>
)}

    </div>
  );
}

