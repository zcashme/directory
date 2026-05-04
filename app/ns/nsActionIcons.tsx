import type { SVGProps } from "react";

export type NsActionIconKey =
  | "directory"
  | "start"
  | "office"
  | "events"
  | "accept"
  | "learn"
  | "community"
  | "ux";

function NsIconBase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function getNsActionIconKeyFromHref(href: string): NsActionIconKey | null {
  if (href === "/ns") return "directory";
  if (href === "/ns/start") return "start";
  if (href === "/ns/office") return "office";
  if (href === "/ns/events") return "events";
  if (href === "/ns/accept") return "accept";
  if (href === "/ns/learn") return "learn";
  if (href === "/ns/community") return "community";
  if (href === "/ns/ux") return "ux";
  return null;
}

export function NsActionIcon({
  iconKey,
  className = "h-4 w-4",
}: {
  iconKey: NsActionIconKey;
  className?: string;
}) {
  switch (iconKey) {
    case "directory":
      return (
        <NsIconBase className={className}>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
          <path d="M4 6h4v12H4z" />
        </NsIconBase>
      );
    case "start":
      return (
        <NsIconBase className={className}>
          <path d="M5 19c3-6 7.5-10.5 13-13" />
          <path d="M14 6h4v4" />
          <path d="M8 16l2 2" />
        </NsIconBase>
      );
    case "office":
      return (
        <NsIconBase className={className}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
          <path d="M4 10h16" />
          <path d="M12 13v3" />
          <path d="M12 13l2 1" />
        </NsIconBase>
      );
    case "events":
      return (
        <NsIconBase className={className}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
          <path d="M4 10h16" />
          <path d="M8 14h3" />
          <path d="M8 17h8" />
        </NsIconBase>
      );
    case "accept":
      return (
        <NsIconBase className={className}>
          <path d="M4 8h16" />
          <path d="M6 8V6h12v2" />
          <path d="M5 8v10h14V8" />
          <path d="M9 12h6" />
          <path d="M12 10v5" />
        </NsIconBase>
      );
    case "learn":
      return (
        <NsIconBase className={className}>
          <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21z" />
          <path d="M5 5.5V21" />
          <path d="M9 7h6" />
          <path d="M9 11h6" />
        </NsIconBase>
      );
    case "community":
      return (
        <NsIconBase className={className}>
          <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M17 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path d="M4.5 19a4.5 4.5 0 0 1 9 0" />
          <path d="M14.5 19a3.5 3.5 0 0 1 5 0" />
        </NsIconBase>
      );
    case "ux":
      return (
        <NsIconBase className={className}>
          <circle cx="11" cy="11" r="6" />
          <path d="m20 20-4.2-4.2" />
          <path d="M11 8v6" />
          <path d="M8 11h6" />
        </NsIconBase>
      );
    default:
      return null;
  }
}
