import type { PendingEdits } from "@/lib/profile/types";

export interface FeedbackProps {
  setForceShowQR?: (value: boolean | ((prev: boolean) => boolean)) => void;
  pendingEdits?: PendingEdits;
  setPendingEdits?: (edits: PendingEdits | ((prev: PendingEdits) => PendingEdits)) => void;
}
