interface FieldMessagesProps {
  id?: string;
  showValidation: boolean;
  hasError: boolean;
  hasInfo: boolean;
  displayMessage?: string;
  infoMessage?: string;
}

/**
 * Shared message display for form fields (error, info, static info)
 */
export default function FieldMessages({
  id,
  showValidation,
  hasError,
  hasInfo,
  displayMessage,
  infoMessage,
}: FieldMessagesProps) {
  const messageId = id ? `${id}-message` : undefined;

  return (
    <>
      {/* Error message */}
      {showValidation && hasError && displayMessage && (
        <p id={messageId} className="text-xs text-red-600 mt-1" role="alert">
          {displayMessage}
        </p>
      )}

      {/* Info message */}
      {showValidation && hasInfo && displayMessage && (
        <p id={messageId} className="text-xs text-blue-600 mt-1">
          {displayMessage}
        </p>
      )}

      {/* Static info message */}
      {!hasError && !hasInfo && infoMessage && (
        <p id={messageId} className="text-xs text-gray-500 mt-1">
          {infoMessage}
        </p>
      )}
    </>
  );
}
