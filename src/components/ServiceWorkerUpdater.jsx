import { useRegisterSW } from 'virtual:pwa-register/react';
import { useEffect } from 'react';

/**
 * ServiceWorkerUpdater
 * 
 * This component listens for Service Worker updates.
 * Because we have configured `skipWaiting: true` and `clientsClaim: true`,
 * the new SW will activate immediately.
 * 
 * This component listens for the `controllerchange` event.
 * When it fires, it means the new SW has taken over, so we reload the page
 * to ensure the user is seeing the latest version of the app.
 */
export default function ServiceWorkerUpdater() {
    useRegisterSW();

    useEffect(() => {
        const handleControllerChange = () => {
            console.log('[ServiceWorkerUpdater] Controller changed. Reloading page...');
            window.location.reload();
        };

        navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

        return () => {
            navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
        };
    }, []);

    return null; // Headless component
}
