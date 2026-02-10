import { motion } from "framer-motion";
import type { ReactNode } from "react";

const slide = {
  initial: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  animate: { x: 0, opacity: 1, transition: { duration: 0.22 } },
  exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0, transition: { duration: 0.18 } }),
};

interface StepContainerProps {
  children: ReactNode;
  stepKey: string | number;
  dir: number;
}

export default function StepContainer({ children, stepKey, dir }: StepContainerProps) {
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
