import Button from "@/ui/common/buttons/Button";
import Modal from "@/ui/common/modals/Modal";
import ModalBody from "@/ui/common/modals/ModalBody";
import Spinner from "@/ui/common/feedback/Spinner";

interface RedirectModalProps {
  isOpen: boolean;
  label: string;
}

export function RedirectModal({ isOpen, label }: RedirectModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      size="sm"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <ModalBody className="flex flex-col items-center text-center gap-3 py-8">
        <Spinner size="xl" color="blue" />
        <h3 className="text-lg font-semibold text-gray-900">
          Redirecting to {label}
        </h3>
        <p className="text-sm text-gray-600">
          Please authorize on the next page...
        </p>
      </ModalBody>
    </Modal>
  );
}

interface AvatarPreviewModalProps {
  isOpen: boolean;
  src: string;
  onClose: () => void;
}

export function AvatarPreviewModal({ isOpen, src, onClose }: AvatarPreviewModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalBody className="flex flex-col items-center gap-4">
        <img src={src} alt="Avatar preview" className="max-w-full rounded-xl" />
        <Button variant="secondary" size="xs" onClick={onClose}>
          Close
        </Button>
      </ModalBody>
    </Modal>
  );
}
