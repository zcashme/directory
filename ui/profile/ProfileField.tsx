import type { ReactNode } from "react";
import HelpIcon from "@/ui/common/HelpIcon";

const VERIFY_HINT_CLASS = "text-xs text-gray-500 italic";

interface DeleteActionButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  isDeleted?: boolean;
}

function DeleteActionButton({ onClick, disabled = false, isDeleted = false }: DeleteActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-xs font-normal hover:underline ${disabled
        ? "text-gray-400 cursor-not-allowed"
        : isDeleted
          ? "text-green-700"
          : "text-red-600"
        }`}
    >
      {isDeleted ? "⌦ Reset" : "⌫ Delete"}
    </button>
  );
}

export { DeleteActionButton };

interface ProfileFieldProps {
  label: string;
  htmlFor?: string;
  helpText: string;
  hasPending?: boolean;
  pendingHint?: string;
  pendingHintClassName?: string;
  isDeleted?: boolean;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  deletePopup?: ReactNode;
  children: ReactNode;
}

export default function ProfileField({
  label,
  htmlFor,
  helpText,
  hasPending = false,
  pendingHint = "Verify to apply changes",
  pendingHintClassName = VERIFY_HINT_CLASS,
  isDeleted = false,
  onDelete,
  deleteDisabled = false,
  deletePopup = null,
  children,
}: ProfileFieldProps) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor={htmlFor} className="font-semibold text-gray-700">
            {label}
          </label>
          {hasPending && (
            <span className={pendingHintClassName}>{pendingHint}</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {deletePopup ? (
            <div className="relative inline-block">
              <DeleteActionButton
                disabled={deleteDisabled}
                isDeleted={isDeleted}
                onClick={onDelete}
              />
              {deletePopup}
            </div>
          ) : (
            <DeleteActionButton
              disabled={deleteDisabled}
              isDeleted={isDeleted}
              onClick={onDelete}
            />
          )}
          <HelpIcon text={helpText} />
        </div>
      </div>
      {children}
    </div>
  );
}
