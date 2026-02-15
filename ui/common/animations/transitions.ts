import type { Variants } from 'framer-motion'

/**
 * Fade in/out animation variant
 *
 * Simple opacity transition for subtle content appearance/disappearance.
 *
 * @example
 * ```tsx
 * import { motion } from 'framer-motion'
 * import { fadeIn } from '@/ui/common/animations/transitions'
 *
 * <motion.div
 *   variants={fadeIn}
 *   initial="initial"
 *   animate="animate"
 *   exit="exit"
 * >
 *   Content
 * </motion.div>
 * ```
 */
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
}

/**
 * Scale in/out animation variant
 *
 * Subtle scale + opacity transition for elements that should feel like they're
 * popping into/out of view. Great for cards, tooltips, and small UI elements.
 *
 * @example
 * ```tsx
 * import { motion } from 'framer-motion'
 * import { scaleIn } from '@/ui/common/animations/transitions'
 *
 * <motion.div
 *   variants={scaleIn}
 *   initial="initial"
 *   animate="animate"
 *   exit="exit"
 * >
 *   Card content
 * </motion.div>
 * ```
 */
export const scaleIn: Variants = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: { duration: 0.2 } },
  exit: { scale: 0.95, opacity: 0, transition: { duration: 0.15 } }
}

/**
 * Slide in/out animation variant (horizontal)
 *
 * Directional slide animation for multi-step flows, wizards, or carousels.
 * Accepts a custom direction parameter: positive = left-to-right, negative = right-to-left.
 *
 * @example
 * ```tsx
 * import { motion } from 'framer-motion'
 * import { slideIn } from '@/ui/common/animations/transitions'
 *
 * // In a step-based wizard
 * const [step, setStep] = useState(0)
 * const [direction, setDirection] = useState(1)
 *
 * <AnimatePresence mode="wait" custom={direction}>
 *   <motion.div
 *     key={step}
 *     custom={direction}
 *     variants={slideIn}
 *     initial="initial"
 *     animate="animate"
 *     exit="exit"
 *   >
 *     Step content
 *   </motion.div>
 * </AnimatePresence>
 * ```
 *
 * @see ui/signup/StepContainer.tsx for a real-world usage example
 */
export const slideIn: Variants = {
  initial: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.22 }
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -40 : 40,
    opacity: 0,
    transition: { duration: 0.18 }
  })
}

/**
 * Slide up animation variant
 *
 * Vertical slide from bottom to top, good for success messages, notifications,
 * or content that should feel like it's "rising" into view.
 *
 * @example
 * ```tsx
 * import { motion } from 'framer-motion'
 * import { slideUp } from '@/ui/common/animations/transitions'
 *
 * <motion.div
 *   variants={slideUp}
 *   initial="initial"
 *   animate="animate"
 *   exit="exit"
 * >
 *   Notification message
 * </motion.div>
 * ```
 */
export const slideUp: Variants = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.2 } },
  exit: { y: 20, opacity: 0, transition: { duration: 0.15 } }
}

/**
 * Slide down animation variant
 *
 * Vertical slide from top to bottom, ideal for dropdowns, menus, or content
 * that should feel like it's "dropping" into view.
 *
 * @example
 * ```tsx
 * import { motion } from 'framer-motion'
 * import { slideDown } from '@/ui/common/animations/transitions'
 *
 * <motion.div
 *   variants={slideDown}
 *   initial="initial"
 *   animate="animate"
 *   exit="exit"
 * >
 *   Dropdown content
 * </motion.div>
 * ```
 */
export const slideDown: Variants = {
  initial: { y: -20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: { duration: 0.2 } },
  exit: { y: -20, opacity: 0, transition: { duration: 0.15 } }
}

/**
 * Expand/collapse animation variant
 *
 * Height-based animation for accordion-style content or expandable sections.
 * Uses 'auto' height for flexible content sizes.
 *
 * @example
 * ```tsx
 * import { motion, AnimatePresence } from 'framer-motion'
 * import { expandCollapse } from '@/ui/common/animations/transitions'
 *
 * const [isOpen, setIsOpen] = useState(false)
 *
 * <AnimatePresence>
 *   {isOpen && (
 *     <motion.div
 *       variants={expandCollapse}
 *       initial="initial"
 *       animate="animate"
 *       exit="exit"
 *     >
 *       Expandable content
 *     </motion.div>
 *   )}
 * </AnimatePresence>
 * ```
 *
 * @see ui/profile/VerifiedBadge.tsx for CSS-based expand/collapse alternative
 */
export const expandCollapse: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { duration: 0.2 } },
  exit: { height: 0, opacity: 0, transition: { duration: 0.15 } }
}

/**
 * Modal animation variant
 *
 * Combined scale + opacity for modal dialogs. Creates a subtle "pop" effect
 * that draws attention without being jarring.
 *
 * @example
 * ```tsx
 * import { motion, AnimatePresence } from 'framer-motion'
 * import { modalVariant, backdropVariant } from '@/ui/common/animations/transitions'
 *
 * const [isOpen, setIsOpen] = useState(false)
 *
 * <AnimatePresence>
 *   {isOpen && (
 *     <>
 *       <motion.div
 *         variants={backdropVariant}
 *         initial="initial"
 *         animate="animate"
 *         exit="exit"
 *         className="fixed inset-0 bg-black/60"
 *         onClick={() => setIsOpen(false)}
 *       />
 *       <motion.div
 *         variants={modalVariant}
 *         initial="initial"
 *         animate="animate"
 *         exit="exit"
 *         className="fixed inset-0 flex items-center justify-center"
 *       >
 *         <div className="bg-white rounded-lg p-6">
 *           Modal content
 *         </div>
 *       </motion.div>
 *     </>
 *   )}
 * </AnimatePresence>
 * ```
 *
 * @see ui/verification/SubmitOtp.tsx for modal implementation (uses Tailwind animate-in)
 */
export const modalVariant: Variants = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: { duration: 0.2 } },
  exit: { scale: 0.95, opacity: 0, transition: { duration: 0.15 } }
}

/**
 * Backdrop fade animation variant
 *
 * Simple opacity animation for modal/overlay backdrops. Pair with modalVariant
 * for complete modal animations.
 *
 * @example
 * ```tsx
 * import { motion } from 'framer-motion'
 * import { backdropVariant } from '@/ui/common/animations/transitions'
 *
 * <motion.div
 *   variants={backdropVariant}
 *   initial="initial"
 *   animate="animate"
 *   exit="exit"
 *   className="fixed inset-0 bg-black/60 backdrop-blur-sm"
 *   onClick={onClose}
 * />
 * ```
 */
export const backdropVariant: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
}
