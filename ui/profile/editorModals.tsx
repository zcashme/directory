import { Button, Modal, ModalBody, ModalHeader, ModalFooter, Spinner } from "@/ui/common";

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

interface AvatarReauthModalProps {
  isOpen: boolean;
  providerLabel: string;
  onReauth: () => void;
  onLater: () => void;
}

export function AvatarReauthModal({ isOpen, providerLabel, onReauth, onLater }: AvatarReauthModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onLater} size="sm">
      <ModalHeader title="Avatar not available" />
      <ModalBody>
        <p className="text-sm text-gray-600">
          Please reauthenticate {providerLabel} to fetch your avatar, or do this later.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="xs" onClick={onLater}>
          Later
        </Button>
        <Button variant="primary" size="xs" onClick={onReauth}>
          Reauthenticate
        </Button>
      </ModalFooter>
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
