import { memo } from "react";

const TOKEN_COLORS: Record<string, string> = {
  ZEC: "bg-yellow-400",
  BTC: "bg-orange-400",
  ETH: "bg-[var(--color-brand-blue)]/40",
  USDC: "bg-[var(--color-brand-blue)]/30",
  USDT: "bg-green-400",
  SOL: "bg-purple-400",
  ARB: "bg-[var(--color-brand-blue)]/55",
  NEAR: "bg-gray-700",
};

interface TokenIconProps {
  symbol: string;
  size?: number;
}

export function TokenIcon({ symbol, size = 40 }: TokenIconProps) {
  const color = TOKEN_COLORS[symbol] || "bg-gray-400";

  return (
    <div
      className={`${color} rounded-full flex items-center justify-center text-white font-bold`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      title={symbol}
    >
      {symbol?.[0] || "?"}
    </div>
  );
}

interface SwapCurrencyPairProps {
  fromSymbol: string;
  toSymbol: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

/**
 * Displays a swap currency pair with icons and arrow
 * Example: BTC → ZEC
 */
function SwapCurrencyPair({
  fromSymbol,
  toSymbol,
  size = "md",
  showLabel = false,
}: SwapCurrencyPairProps) {
  const iconSizes = {
    sm: 32,
    md: 40,
    lg: 56,
  };

  const iconSize = iconSizes[size];
  const gap = size === "lg" ? "gap-4" : size === "md" ? "gap-3" : "gap-2";
  const textSize = size === "lg" ? "text-2xl" : size === "md" ? "text-xl" : "text-lg";
  const labelSize =
    size === "lg" ? "text-base" : size === "md" ? "text-sm" : "text-xs";

  return (
    <div className="flex flex-col items-center">
      <div className={`flex items-center ${gap}`}>
        <div className="flex flex-col items-center">
          <TokenIcon symbol={fromSymbol} size={iconSize} />
          {showLabel && (
            <span className={`${labelSize} text-gray-600 mt-1 font-medium`}>
              {fromSymbol}
            </span>
          )}
        </div>

        <div className="flex flex-col items-center">
          <div className={`${textSize} font-bold text-gray-800`}>→</div>
        </div>

        <div className="flex flex-col items-center">
          <TokenIcon symbol={toSymbol} size={iconSize} />
          {showLabel && (
            <span className={`${labelSize} text-gray-600 mt-1 font-medium`}>
              {toSymbol}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(SwapCurrencyPair);
