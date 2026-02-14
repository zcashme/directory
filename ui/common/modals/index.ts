/**
 * Modal Components
 *
 * A complete modal system with base components and pre-built dialogs.
 *
 * ## Components
 *
 * - **Modal**: Base modal with backdrop, animations, and size variants
 * - **ModalHeader**: Header section with title and optional close button
 * - **ModalBody**: Scrollable content area
 * - **ModalFooter**: Footer section for action buttons
 * - **ConfirmDialog**: Pre-built confirmation dialog
 *
 * @example Basic Modal
 * ```tsx
 * import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/ui/common/modals';
 * import { Button } from '@/ui/common/buttons';
 *
 * function MyModal({ isOpen, onClose }) {
 *   return (
 *     <Modal isOpen={isOpen} onClose={onClose} size="md">
 *       <ModalHeader title="Welcome" onClose={onClose} />
 *       <ModalBody>
 *         <p>This is a basic modal.</p>
 *       </ModalBody>
 *       <ModalFooter>
 *         <Button onClick={onClose}>Close</Button>
 *       </ModalFooter>
 *     </Modal>
 *   );
 * }
 * ```
 *
 * @example Confirmation Dialog
 * ```tsx
 * import { ConfirmDialog } from '@/ui/common/modals';
 *
 * function DeleteConfirm({ isOpen, onClose, onDelete }) {
 *   return (
 *     <ConfirmDialog
 *       isOpen={isOpen}
 *       onClose={onClose}
 *       onConfirm={onDelete}
 *       title="Delete Item"
 *       message="This action cannot be undone."
 *       variant="danger"
 *       confirmText="Delete"
 *     />
 *   );
 * }
 * ```
 */

// Base modal components
export { default as Modal } from "./Modal";
export type { ModalProps } from "./Modal";

export { default as ModalHeader } from "./ModalHeader";
export type { ModalHeaderProps } from "./ModalHeader";

export { default as ModalBody } from "./ModalBody";
export type { ModalBodyProps } from "./ModalBody";

export { default as ModalFooter } from "./ModalFooter";
export type { ModalFooterProps } from "./ModalFooter";

// Pre-built dialogs
export { default as ConfirmDialog } from "./ConfirmDialog";
export type { ConfirmDialogProps } from "./ConfirmDialog";

export { default as TutorialModal } from "./TutorialModal";
export type { TutorialModalProps, TutorialStep } from "./TutorialModal";
