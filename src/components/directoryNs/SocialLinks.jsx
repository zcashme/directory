import { FALLBACK_ICON } from "../../utils/domainLabels";
import { getLinkLabel, getSocialDisplay, getSocialHandle, isDiscordLink } from "../../utils/linkUtils";

export default function SocialLinks({
  links = [],
  onUnverifiedClick,
  stopPropagation = false,
  className = "mt-2 flex flex-wrap content-start gap-2",
  linkClassName = "flex h-7 items-center gap-2 border border-gray-900 bg-white px-2 text-[10px] font-semibold uppercase transition-transform duration-150 hover:scale-[1.05] rounded-none",
}) {
  if (!links.length) return null;

  const handleStop = stopPropagation
    ? (event) => event.stopPropagation()
    : undefined;

  return (
    <div className={className}>
      {links.map((link) => {
        const isDiscord = isDiscordLink(link.url);
        const isVerified = Boolean(link.is_verified);
        const displayHandle = getSocialDisplay(link);
        const title = link.domainLabel || getLinkLabel(link.url);

        if (!isVerified) {
          return (
            <button
              key={link.id || link.url}
              type="button"
              onClick={(event) => {
                if (stopPropagation) event.stopPropagation();
                onUnverifiedClick?.({
                  url: link.url,
                  label: link.label || "",
                  display: getSocialHandle(link.url),
                  isDiscord,
                });
              }}
              className={linkClassName}
              title={title}
            >
              <img
                src={link.icon?.src || link.icon || FALLBACK_ICON?.src || FALLBACK_ICON}
                alt={title}
                className="h-4 w-4"
              />
              <span className="max-w-[120px] truncate">{displayHandle}</span>
            </button>
          );
        }

        return (
          <a
            key={link.id || link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleStop}
            className={linkClassName}
            title={title}
          >
            <img
              src={link.icon?.src || link.icon || FALLBACK_ICON?.src || FALLBACK_ICON}
              alt={title}
              className="h-4 w-4"
            />
            <span className="flex max-w-[140px] items-end gap-1 truncate">
              <span className="truncate">{displayHandle}</span>
              <span className="-translate-y-[1px]" aria-label="Verified">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5 text-green-600 drop-shadow-sm"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M7.5 13.2L4.8 10.5l-1.4 1.4 4.1 4.1 9.5-9.5-1.4-1.4z" />
                </svg>
              </span>
            </span>
          </a>
        );
      })}
    </div>
  );
}
