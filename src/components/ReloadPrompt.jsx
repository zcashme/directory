import { useRegisterSW } from 'virtual:pwa-register/react';

function ReloadPrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setNeedRefresh(false);
    };

    return (
        <div className="ReloadPrompt-container">
            {needRefresh && (
                <div
                    className="fixed bottom-4 right-4 z-[9999] max-w-sm rounded-xl border border-black/10 bg-white p-4 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom"
                    role="alert"
                >
                    <div className="mb-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                            New version available
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                            Click reload to update the app.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                            onClick={() => updateServiceWorker(true)}
                        >
                            Reload
                        </button>
                        <button
                            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={close}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ReloadPrompt;
