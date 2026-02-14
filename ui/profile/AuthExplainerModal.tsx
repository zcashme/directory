import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from "@/ui/common";

interface AuthExplainerModalProps {
  isOpen: boolean;
  canAuthenticate: boolean;
  authPending?: boolean;
  authRedirectOpen?: boolean;
  providerLabel?: string;
  onClose: () => void;
  onAuthenticate: () => void;
}

export default function AuthExplainerModal({
  isOpen,
  canAuthenticate,
  authPending,
  authRedirectOpen,
  providerLabel,
  onClose,
  onAuthenticate,
}: AuthExplainerModalProps) {
  const isPending = authPending || authRedirectOpen;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader title="Link not authenticated" />
      <ModalBody>
        <p className="text-sm text-gray-600">
          Ownership has not been confirmed for this link. We do not know if the person who added it actually owns it.
        </p>
        {canAuthenticate ? (
          <p className="text-sm text-gray-600 mt-2">
            If you own this account, authenticate it to prove ownership.
          </p>
        ) : (
          <p className="text-sm text-gray-500 mt-2">
            Only verified profiles can authenticate links.
          </p>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" size="xs" onClick={onClose}>
          Close
        </Button>
        {canAuthenticate && (
          <Button
            variant="secondary"
            size="xs"
            onClick={onAuthenticate}
            disabled={isPending}
            className={
              isPending
                ? "!bg-yellow-50 !text-yellow-700 !border-yellow-300"
                : "!text-blue-600 !border-blue-400 hover:!bg-blue-50"
            }
          >
            {isPending
              ? "Pending"
              : providerLabel
                ? `Authenticate with ${providerLabel}`
                : "Authenticate"}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
