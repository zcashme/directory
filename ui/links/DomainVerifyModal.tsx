"use client";

import { useEffect, useState } from "react";
import Modal from "@/ui/common/modals/Modal";
import ModalHeader from "@/ui/common/modals/ModalHeader";
import ModalBody from "@/ui/common/modals/ModalBody";
import ModalFooter from "@/ui/common/modals/ModalFooter";
import Button from "@/ui/common/buttons/Button";
import CopyButton from "@/ui/common/buttons/CopyButton";
import Alert from "@/ui/common/feedback/Alert";
import { verifyDomainLink } from "@/ui/links/verifyDomain";
import { verifyDomainDns, getDomainDnsInstructions } from "@/ui/links/verifyDomainDns";
import { normalizeDomainUrl } from "@/ui/links/providers";
import type { VerifyDomainError, DomainDnsInstructions } from "@/ui/links/verifyDomainTypes";

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
  "dns-lookup-failed": "Couldn't query DNS for this domain. Try again in a moment.",
  "no-txt-record": "No TXT record was found at that name. DNS changes can take a few minutes to propagate.",
  "txt-mismatch": "Found a TXT record, but its value doesn't match the expected token.",
  "internal-error": "Something went wrong on our end. Please try again.",
};

type Method = "rel-me" | "dns";

function getDnsHostLabel(recordName: string, zoneHost: string): string {
  const cleanRecord = recordName.trim().replace(/\.$/, "");
  const cleanZone = zoneHost.trim().toLowerCase().replace(/\.$/, "");
  const lowerRecord = cleanRecord.toLowerCase();
  if (!cleanZone) return cleanRecord;
  if (lowerRecord === cleanZone) return "@";
  const suffix = `.${cleanZone}`;
  if (!lowerRecord.endsWith(suffix)) return cleanRecord;
  return cleanRecord.slice(0, cleanRecord.length - suffix.length);
}

export default function DomainVerifyModal({
  isOpen,
  onClose,
  profileId,
  profileSlug,
  url,
  baseDomain,
  onVerified,
}: DomainVerifyModalProps) {
  const [method, setMethod] = useState<Method>("rel-me");
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [dnsInstructions, setDnsInstructions] = useState<DomainDnsInstructions | null>(null);
  const [dnsLoading, setDnsLoading] = useState(false);

  const origin = baseDomain || process.env.NEXT_PUBLIC_BASE_DOMAIN || "zcash.me";
  const profileUrl = `https://${origin}/${profileSlug}`;
  const snippet = `<link rel="me" href="${profileUrl}">`;

  const normalized = normalizeDomainUrl(url);
  const displayHost = normalized ? new URL(normalized).hostname : url;
  const dnsHostLabel = dnsInstructions ? getDnsHostLabel(dnsInstructions.name, displayHost) : "";

  // Fetch DNS instructions when the user switches to DNS mode for the first time.
  useEffect(() => {
    if (method !== "dns" || dnsInstructions || !isOpen) return;
    let cancelled = false;
    setDnsLoading(true);
    setErrorMsg("");
    (async () => {
      try {
        const result = await getDomainDnsInstructions(profileId, url);
        if (cancelled) return;
        if (result.ok && result.instructions) {
          setDnsInstructions(result.instructions);
        } else {
          setErrorMsg(result.error ? ERROR_MESSAGES[result.error] : "Couldn't load DNS instructions.");
        }
      } catch {
        if (!cancelled) setErrorMsg("Couldn't load DNS instructions.");
      } finally {
        if (!cancelled) setDnsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [method, dnsInstructions, isOpen, profileId, url]);

  const handleVerify = async () => {
    setPending(true);
    setErrorMsg("");
    setSuccess(false);
    try {
      const result =
        method === "rel-me"
          ? await verifyDomainLink(profileId, url)
          : await verifyDomainDns(profileId, url);
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
    setMethod("rel-me");
    setDnsInstructions(null);
    setDnsLoading(false);
    onClose();
  };

  const switchMethod = (next: Method) => {
    if (pending || success) return;
    setMethod(next);
    setErrorMsg("");
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalHeader title={`Authenticate ${displayHost}`} onClose={handleClose} />
      <ModalBody className="space-y-4">
        {method === "rel-me" ? (
          <>
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

            <p className="text-xs text-gray-500">
              Or,{" "}
              <button
                type="button"
                className="text-[var(--color-brand-blue)] underline hover:opacity-80"
                onClick={() => switchMethod("dns")}
              >
                try DNS-based verification
              </button>
              .
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-700">
              Prove you control <span className="font-semibold">{displayHost}</span> by adding a
              DNS TXT record:
            </p>

            {dnsLoading && (
              <p className="text-xs text-gray-500">Loading DNS instructions...</p>
            )}

            {dnsInstructions && (
              <div className="rounded-md border border-gray-300 bg-gray-50 p-3 space-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Type</div>
                  <code className="text-xs text-gray-800">TXT</code>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                    Host label (Namecheap/Cloudflare)
                  </div>
                  <div className="flex items-start gap-2">
                    <code className="text-xs text-gray-800 break-all flex-1">{dnsHostLabel}</code>
                    <CopyButton text={dnsHostLabel} label="Copy" copiedLabel="Copied" size="xs" />
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                    Full DNS name (FQDN)
                  </div>
                  <div className="flex items-start gap-2">
                    <code className="text-xs text-gray-800 break-all flex-1">{dnsInstructions.name}</code>
                    <CopyButton text={dnsInstructions.name} label="Copy" copiedLabel="Copied" size="xs" />
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">Value</div>
                  <div className="flex items-start gap-2">
                    <code className="text-xs text-gray-800 break-all flex-1">{dnsInstructions.value}</code>
                    <CopyButton text={dnsInstructions.value} label="Copy" copiedLabel="Copied" size="xs" />
                  </div>
                </div>
              </div>
            )}

            <ol className="text-xs text-gray-600 list-decimal pl-5 space-y-1">
              <li>Open your DNS provider (Cloudflare, Namecheap, Route 53, etc.).</li>
              <li>
                Add a new <strong>TXT</strong> record. Use <code>{dnsHostLabel ?? "_zcashme"}</code> when your
                provider asks for a host label, or <code>{dnsInstructions?.name ?? "_zcashme.example.com"}</code>{" "}
                when it asks for a full name.
              </li>
              <li>Wait a minute or two for DNS to propagate, then click <strong>Verify</strong>.</li>
            </ol>

            <p className="text-xs text-gray-500">
              Or,{" "}
              <button
                type="button"
                className="text-[var(--color-brand-blue)] underline hover:opacity-80"
                onClick={() => switchMethod("rel-me")}
              >
                use rel=&quot;me&quot; instead
              </button>
              .
            </p>
          </>
        )}

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
        <Button
          variant="primary"
          onClick={handleVerify}
          disabled={pending || success || (method === "dns" && !dnsInstructions)}
        >
          {pending ? "Verifying..." : "Verify"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
