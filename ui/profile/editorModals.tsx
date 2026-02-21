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
  const avatarSize = 120;
  const outerSize = avatarSize + 6;
  const borderMaskWidth = avatarSize + 18;
  const previewTopPx = 98;
  const cornerSizePx = 16;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalBody className="flex flex-col items-center gap-4 py-8">
        {src ? (
          <div className="w-full max-w-md">
            <div className="relative h-56 px-4">
              <div
                className="pointer-events-none absolute z-0 rounded-t-2xl"
                style={{
                  left: "1rem",
                  right: "1rem",
                  top: `${previewTopPx + 1}px`,
                  bottom: "1rem",
                  background:
                    "linear-gradient(to bottom, var(--color-background) 0%, color-mix(in srgb, var(--color-background) 65%, transparent) 55%, transparent 100%)",
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute z-0 h-px border-t border-gray-300 rounded-t-2xl"
                style={{
                  left: `calc(1rem + ${cornerSizePx - 1}px)`,
                  right: `calc(1rem + ${cornerSizePx - 1}px)`,
                  top: `${previewTopPx}px`,
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute z-0 w-4 h-4 border-l border-t border-gray-300 rounded-tl-2xl"
                style={{ left: "1rem", top: `${previewTopPx}px` }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute z-0 w-4 h-4 border-r border-t border-gray-300 rounded-tr-2xl"
                style={{ right: "1rem", top: `${previewTopPx}px` }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute z-0 w-px bg-gradient-to-b from-gray-300 via-gray-300/65 to-transparent"
                style={{ left: "1rem", top: `calc(${previewTopPx}px + 14px)`, bottom: "1rem" }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute z-0 w-px bg-gradient-to-b from-gray-300 via-gray-300/65 to-transparent"
                style={{ right: "1rem", top: `calc(${previewTopPx}px + 14px)`, bottom: "1rem" }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute left-1/2 z-0 h-[6px] -translate-x-1/2 rounded-b-full bg-[var(--color-background)]"
                style={{ width: `${borderMaskWidth}px`, top: `${previewTopPx - 2}px` }}
                aria-hidden
              />
              <div
                className="absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ top: `${previewTopPx}px` }}
                aria-hidden
              >
                <div
                  className="relative rounded-full overflow-hidden shrink-0 border border-black bg-[var(--color-background)]"
                  style={{ width: `${outerSize}px`, height: `${outerSize}px` }}
                >
                  <div className="absolute inset-[2px] rounded-full overflow-hidden">
                    <img
                      src={src}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No pending upload selected</p>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]"
        >
          Close Preview
        </Button>
      </ModalBody>
    </Modal>
  );
}
