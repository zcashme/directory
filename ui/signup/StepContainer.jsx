import { motion } from "framer-motion";

const slide = {
  initial: (dir) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  animate: { x: 0, opacity: 1, transition: { duration: 0.22 } },
  exit: (dir) => ({ x: dir > 0 ? -40 : 40, opacity: 0, transition: { duration: 0.18 } }),
};

export default function StepContainer({ children, stepKey, dir }) {
  return (
    <motion.div
      key={stepKey}
      custom={dir}
      variants={slide}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
