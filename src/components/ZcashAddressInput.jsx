import { useState, useEffect } from "react";
import { validateZcashAddress, getZcashAddressHint } from "../utils/zcashAddressUtils";

export default function ZcashAddressInput({ value, onChange, label = "Zcash Address", id = "zcash-address" }) {
  const [help, setHelp] = useState(getZcashAddressHint(value));
  const isValid = validateZcashAddress(value).valid;

  useEffect(() => {
    setHelp(getZcashAddressHint(value));
  }, [value]);

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium uppercase tracking-wide text-gray-600 mb-1">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="zs1... or u1..."
        className={`w-full rounded-2xl border px-3 py-2 text-sm font-mono outline-none bg-transparent ${
          isValid ? "border-black/30 focus:border-blue-600" : "border-red-400 focus:border-red-500"
        }`}
        autoComplete="off"
      />
      <p className={`mt-1 text-xs ${isValid ? "text-green-600" : "text-gray-500"}`}>{help}</p>
    </div>
  );
}

