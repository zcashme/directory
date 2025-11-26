// File: src/components/LinkInput.jsx
import { useState, useEffect } from "react";
import { isValidUrl } from "../utils/validateUrl";

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
        className={`w-full border rounded-lg px-3 py-1.5 text-sm font-mono ${
          readOnly
            ? "bg-gray-100 text-gray-500 cursor-not-allowed"
            : valid
            ? "border-gray-300 focus:border-blue-500"
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

