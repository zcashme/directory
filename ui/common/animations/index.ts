/**
 * Animation Variants
 *
 * Pre-configured Framer Motion animation variants for consistent transitions
 * throughout the application.
 *
 * ## Philosophy
 *
 * - **Fast & Responsive**: Durations range from 0.15s to 0.22s for snappy feel
 * - **Subtle Motion**: Small offsets (20-40px) and scale changes (0.95-1.0)
 * - **Purposeful**: Each variant serves a specific UI pattern
 * - **Accessible**: All animations respect prefers-reduced-motion (handled by Framer Motion)
 *
 * ## Usage Patterns
 *
 * ### Basic Animation
 * ```tsx
 * import { motion } from 'framer-motion'
 * import { fadeIn } from '@/ui/common/animations'
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
 *
 * ### With AnimatePresence
 * ```tsx
 * import { motion, AnimatePresence } from 'framer-motion'
 * import { scaleIn } from '@/ui/common/animations'
 *
 * <AnimatePresence mode="wait">
 *   {isVisible && (
 *     <motion.div
 *       variants={scaleIn}
 *       initial="initial"
 *       animate="animate"
 *       exit="exit"
 *     >
 *       Content
 *     </motion.div>
 *   )}
 * </AnimatePresence>
 * ```
 *
 * ### With Custom Direction
 * ```tsx
 * import { motion, AnimatePresence } from 'framer-motion'
 * import { slideIn } from '@/ui/common/animations'
 *
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
 *     Step {step}
 *   </motion.div>
 * </AnimatePresence>
 * ```
 *
 * ### Modal with Backdrop
 * ```tsx
 * import { motion, AnimatePresence } from 'framer-motion'
 * import { modalVariant, backdropVariant } from '@/ui/common/animations'
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
 *         onClick={onClose}
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
 * ## Animation Variants
 *
 * - `fadeIn` - Simple opacity fade
 * - `scaleIn` - Scale + opacity (cards, tooltips)
 * - `slideIn` - Horizontal slide with direction (wizards, carousels)
 * - `slideUp` - Vertical slide from bottom (notifications)
 * - `slideDown` - Vertical slide from top (dropdowns)
 * - `expandCollapse` - Height-based expansion (accordions)
 * - `modalVariant` - Scale + opacity for modals
 * - `backdropVariant` - Fade for modal backdrops
 *
 * ## Reference Implementations
 *
 * - ui/signup/StepContainer.tsx - slideIn usage
 * - ui/verification/SubmitOtp.tsx - modal with backdrop
 * - ui/profile/VerifiedBadge.tsx - CSS-based expand/collapse
 *
 * @module ui/common/animations
 */

export {
  fadeIn,
  scaleIn,
  slideIn,
  slideUp,
  slideDown,
  expandCollapse,
  modalVariant,
  backdropVariant
} from './transitions'
