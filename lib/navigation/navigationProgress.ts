export const NAVIGATION_PROGRESS_START_EVENT = "zcashme:navigation-progress-start";
export const NAVIGATION_PROGRESS_FINISH_EVENT = "zcashme:navigation-progress-finish";

export function emitNavigationProgressStart(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NAVIGATION_PROGRESS_START_EVENT));
}

export function emitNavigationProgressFinish(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NAVIGATION_PROGRESS_FINISH_EVENT));
}
