// New reusable AmountAndWallet component matching Draft styling
import React from "react";

export default function AmountAndWallet({ amount, setAmount, openWallet }) {
  return (
    <div className="flex items-center gap-3 w-full mb-2">
      <div className="relative flex-1">
     <div className="relative flex-1">

  {/* Left-side fixed icon prefix */}
  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-md">
    ⛁
  </div>

  <input
    type="number"
    step="0.0005"
    min="0"
    inputMode="decimal"
    placeholder="0.0000"
    value={amount === "0" ? "" : amount || ""}
    onChange={(e) => {
      const val = e.target.value;
      if (parseFloat(val) < 0) return;
      setAmount(val);
    }}
    className="border border-gray-800 px-3 py-2 rounded-xl w-full 
               text-md pr-16 text-gray-700 
               pl-9"
  />

  {/* Right-side selector */}
  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-gray-400 text-md select-none cursor-not-allowed">
     ZEC ▼
  </div>

</div>

      </div>

      <button
        onClick={openWallet}
        className="flex items-center gap-1 border rounded-xl px-3 py-2 text-md transition-all duration-200 border-gray-800 hover:border-blue-500 text-gray-700 whitespace-nowrap"
      >
        Open in Wallet 
      </button>
    </div>
  );
}