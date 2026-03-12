export const NAVIGATION_PROGRESS_START_EVENT = "zcashme:navigation-progress-start";

export function emitNavigationProgressStart(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NAVIGATION_PROGRESS_START_EVENT));
}
