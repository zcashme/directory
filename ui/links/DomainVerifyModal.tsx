"use client";

import { useState } from "react";
import Modal from "@/ui/common/modals/Modal";
import ModalHeader from "@/ui/common/modals/ModalHeader";
import ModalBody from "@/ui/common/modals/ModalBody";
import ModalFooter from "@/ui/common/modals/ModalFooter";
import Button from "@/ui/common/buttons/Button";
import CopyButton from "@/ui/common/buttons/CopyButton";
import Alert from "@/ui/common/feedback/Alert";
import { verifyDomainLink } from "@/ui/links/verifyDomain";
import { normalizeDomainUrl } from "@/ui/links/providers";
import type { VerifyDomainError } from "@/ui/links/verifyDomainTypes";

interface DomainVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: number;
  profileSlug: string;
  url: string;
  baseDomain?: string;
  onVerified: (url: string) => void;
}

const ERROR_MESSAGES: Record<VerifyDomainError, string> = {
  "address-not-verified": "Verify your profile address first.",
  "link-not-found": "This link is no longer on your profile.",
  "already-verified": "This domain is already authenticated.",
  "invalid-domain": "The link must be a homepage URL like https://example.com.",
  "private-host-blocked": "Private and local network addresses can't be verified.",
  "fetch-failed": "Couldn't reach the domain. Make sure it's publicly accessible over HTTPS.",
  "timeout": "The domain took too long to respond. Try again in a moment.",
  "no-rel-me-tag": "No <link rel=\"me\"> tag was found on the homepage.",
  "rel-me-mismatch": "Found a rel=\"me\" tag, but it doesn't point to this profile.",
  "internal-error": "Something went wrong on our end. Please try again.",
};

export default function DomainVerifyModal({
  isOpen,
  onClose,
  profileId,
  profileSlug,
  url,
  baseDomain,
  onVerified,
}: DomainVerifyModalProps) {
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [success, setSuccess] = useState(false);

  const origin = baseDomain || process.env.NEXT_PUBLIC_BASE_DOMAIN || "zcash.me";
  const profileUrl = `https://${origin}/${profileSlug}`;
  const snippet = `<link rel="me" href="${profileUrl}">`;

  const normalized = normalizeDomainUrl(url);
  const displayHost = normalized ? new URL(normalized).hostname : url;

  const handleVerify = async () => {
    setPending(true);
    setErrorMsg("");
    setSuccess(false);
    try {
      const result = await verifyDomainLink(profileId, url);
      if (result.ok) {
        setSuccess(true);
        onVerified(url);
        setTimeout(() => {
          handleClose();
        }, 1200);
      } else {
        setErrorMsg(result.error ? ERROR_MESSAGES[result.error] : "Verification failed.");
      }
    } catch {
      setErrorMsg("Verification failed. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const handleClose = () => {
    setErrorMsg("");
    setSuccess(false);
    setPending(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalHeader title={`Authenticate ${displayHost}`} onClose={handleClose} />
      <ModalBody className="space-y-4">
        <p className="text-sm text-gray-700">
          Prove you control <span className="font-semibold">{displayHost}</span> by adding
          this tag to its homepage <code className="px-1 bg-gray-100 rounded">&lt;head&gt;</code>:
        </p>

        <div className="relative rounded-md border border-gray-300 bg-gray-50 p-3">
          <pre className="text-xs text-gray-800 whitespace-pre-wrap break-all pr-16">{snippet}</pre>
          <div className="absolute top-2 right-2">
            <CopyButton text={snippet} label="Copy" copiedLabel="Copied" size="xs" />
          </div>
        </div>

        <ol className="text-xs text-gray-600 list-decimal pl-5 space-y-1">
          <li>Paste the snippet inside the <code>&lt;head&gt;</code> of your homepage HTML.</li>
          <li>Publish/deploy so it's live at <code>https://{displayHost}/</code>.</li>
          <li>Click <strong>Verify</strong> below.</li>
        </ol>

        {success && (
          <Alert variant="success" size="sm" message="Domain authenticated!" />
        )}
        {errorMsg && !success && (
          <Alert variant="error" size="sm" message={errorMsg} />
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={pending}>
          Close
        </Button>
        <Button variant="primary" onClick={handleVerify} disabled={pending || success}>
          {pending ? "Verifying..." : "Verify"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
