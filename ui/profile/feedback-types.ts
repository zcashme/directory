import type {
  PendingEdits,
  PendingEditsField,
  PendingEditValue,
} from "@/lib/profile/types";

export interface FeedbackProps {
  setForceShowQR?: (value: boolean | number) => void;
  pendingEdits?: PendingEdits;
  setPendingEdits?: (field: PendingEditsField, value: PendingEditValue) => void;
}
