import { motion } from "framer-motion";

export default function VerifiedCardWrapper({
  verifiedCount = 0,
  onClick,
  className = "",
  children,
}) {
  // Base style tiers
  const baseStyle =
    "rounded-2xl p-3 border transition-all cursor-pointer shadow-sm backdrop-blur-sm";

  const tierStyle =
    verifiedCount >= 3
      ? "border-green-400 bg-gradient-to-r from-green-50/80 via-emerald-50/80 to-green-100/80 relative overflow-hidden"
      : verifiedCount === 2
      ? "border-yellow-400 bg-yellow-50/60 hover:bg-yellow-50 hover:shadow-[0_0_10px_rgba(234,179,8,0.25)]"
      : verifiedCount === 1
      ? "border-blue-300 bg-blue-50/60 hover:bg-blue-50 hover:shadow-[0_0_8px_rgba(59,130,246,0.25)]"
        : "border-gray-500 bg-transparent hover:bg-gray-100/10 hover:shadow-[0_0_4px_rgba(0,0,0,0.05)]";


  return (
    <motion.div
      whileHover={{
        scale: 1.02,
      }}
      transition={{ type: "spring", stiffness: 200, damping: 12 }}
      onClick={onClick}
      className={`${baseStyle} ${tierStyle} ${className}`}
    >
      {/* Animated gradient shimmer for high verification tier */}
      {verifiedCount >= 3 && (
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-300/10 via-emerald-400/20 to-green-300/10 blur-md"
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{
            backgroundSize: "200% 200%",
            zIndex: 0,
          }}
        />
      )}

      {/* Foreground content */}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
