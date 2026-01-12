import CopyButton from "../CopyButton";

export default function NsUnverifiedLinkModal({ unverifiedLink, onClose }) {
  if (!unverifiedLink) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md border border-gray-900 bg-white p-4 text-gray-900 rounded-none">
        <div className="text-xs font-bold uppercase tracking-wide text-gray-700">
          Be Careful
        </div>
        <p className="mt-2 text-sm text-gray-700">
          {unverifiedLink.isDiscord
            ? "This username is not authenticated. It may not belong to the person you are expecting."
            : "This link is not authenticated. It may not belong to the person you are expecting."}
        </p>
        {unverifiedLink.isDiscord ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-base font-black text-gray-900">
              {unverifiedLink.display || unverifiedLink.label || "unknown"}
            </span>
            <CopyButton
              text={unverifiedLink.display || unverifiedLink.label || ""}
              label="Copy"
              copiedLabel="Copied"
            />
          </div>
        ) : (
          <p className="mt-2 break-all text-[11px] text-gray-500">
            {unverifiedLink.url}
          </p>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          {unverifiedLink.isDiscord ? null : (
            <button
              type="button"
              onClick={() => {
                window.open(unverifiedLink.url, "_blank", "noopener,noreferrer");
                onClose?.();
              }}
              className="border border-gray-900 bg-gray-900 px-3 py-1 text-[10px] font-semibold text-white transition-transform duration-150 hover:scale-[1.04] rounded-none"
            >
              Go To
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="border border-gray-900 bg-white px-3 py-1 text-[10px] font-semibold transition-transform duration-150 hover:scale-[1.04] rounded-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
