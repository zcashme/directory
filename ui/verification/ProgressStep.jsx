export default function ProgressStep({
  step,
  index,
  isLast,
  isCurrent,
  isDone,
  showCheckmark = false,
  showFailed = false,
  label,
  className = "",
}) {
  return (
    <span>
      <span className={isCurrent ? "font-bold text-blue-700" : className}>
        {showCheckmark && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="inline-block h-3.5 w-3.5 text-green-600 drop-shadow-xs mr-1 align-[-1px]"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M7.5 13.2L4.8 10.5l-1.4 1.4 4.1 4.1 9.5-9.5-1.4-1.4z" />
          </svg>
        )}
        {showFailed && <span className="text-red-600 mr-1">X</span>}
        {isCurrent ? "Now: " : ""}
        {label}
      </span>
      {!isLast ? " > " : ""}
    </span>
  );
}
