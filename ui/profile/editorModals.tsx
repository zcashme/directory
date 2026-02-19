import Button from "@/ui/common/buttons/Button";
import Modal from "@/ui/common/modals/Modal";
import ModalBody from "@/ui/common/modals/ModalBody";
import ModalFooter from "@/ui/common/modals/ModalFooter";
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

interface LinkNotAuthenticatedModalProps {
  isOpen: boolean;
  platform: string;
  onClose: () => void;
  onAuthenticate: () => void;
}

export function LinkNotAuthenticatedModal({
  isOpen,
  platform,
  onClose,
  onAuthenticate,
}: LinkNotAuthenticatedModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalBody>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Link not authenticated
        </h3>
        <div className="rounded-xl bg-gray-100 p-4 text-sm text-gray-700 space-y-3">
          <p>
            Ownership has not been confirmed for this link. We do not know if
            the person who added it actually owns it.
          </p>
          <p>
            If you own this account, authenticate it to prove ownership.
          </p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="xs" onClick={onClose}>
          Close
        </Button>
        <Button variant="secondary" size="xs" onClick={onAuthenticate}>
          Authenticate with {platform}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export function AvatarPreviewModal({ isOpen, src, onClose }: AvatarPreviewModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalBody className="flex flex-col items-center gap-4">
        {src ? (
          <img src={src} alt="Avatar preview" className="max-w-full rounded-xl" />
        ) : (
          <p className="text-sm text-gray-500">No image URL provided</p>
        )}
        <Button variant="secondary" size="xs" onClick={onClose}>
          Close
        </Button>
      </ModalBody>
    </Modal>
  );
}
