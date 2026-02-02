import ModalPortal from "@/ui/common/ModalPortal";

export function RedirectModal({ isOpen, label }) {
  if (!isOpen) return null;
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs">
        <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 text-center animate-fadeIn">
          <div className="mb-4 text-blue-500">
            <svg className="w-12 h-12 mx-auto animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Redirecting to {label}</h3>
          <p className="text-sm text-gray-600">
            Please authorize the app to verify your profile.
          </p>
        </div>
      </div>
    </ModalPortal>
  );
}

export function AvatarReauthModal({ isOpen, providerLabel, onReauth, onLater }) {
  if (!isOpen) return null;
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs">
        <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm w-full mx-4 text-center animate-fadeIn">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Avatar not available</h3>
          <p className="text-sm text-gray-600 mb-4">
            Please reauthenticate {providerLabel} to fetch your avatar, or do this later.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onLater}
              className="text-xs px-3 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Later
            </button>
            <button
              type="button"
              onClick={onReauth}
              className="text-xs px-3 py-2 text-blue-600 border border-blue-400 rounded hover:bg-blue-50"
            >
              Reauthenticate
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export function AvatarPreviewModal({ isOpen, src, onClose }) {
  if (!isOpen) return null;
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-xs">
        <div className="bg-white rounded-xl p-4 shadow-2xl max-w-sm w-full mx-4 text-center animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-800">Avatar Preview</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
            >
              Close
            </button>
          </div>
          {src ? (
            <img
              src={src}
              alt="Avatar preview"
              className="w-full max-h-[60vh] object-contain rounded"
            />
          ) : (
            <p className="text-sm text-gray-600">No image URL provided.</p>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
