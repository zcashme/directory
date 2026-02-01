export default function AuthExplainerModal({
  isOpen,
  canAuthenticate,
  authPending,
  authRedirectOpen,
  providerLabel,
  onClose,
  onAuthenticate,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 text-left animate-fadeIn"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-800">Link not authenticated</h3>
        <p className="text-sm text-gray-600 mt-2">
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
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-3 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Close
          </button>
          {canAuthenticate && (
            <button
              type="button"
              onClick={onAuthenticate}
              disabled={authPending || authRedirectOpen}
              className={`text-xs px-2 py-1 border rounded ${authPending || authRedirectOpen
                ? "text-yellow-700 border-yellow-400 bg-yellow-50 cursor-not-allowed"
                : "text-blue-600 border-blue-400 hover:bg-blue-50"
                }`}
            >
              {authPending || authRedirectOpen
                ? "Pending"
                : providerLabel
                  ? `Authenticate with ${providerLabel}`
                  : "Authenticate"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
