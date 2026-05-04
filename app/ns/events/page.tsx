import NsLandingPage from "../NsLandingPage";
import { buildNsMetadata } from "../nsLandingContent";

export const metadata = buildNsMetadata("events");

export default function NsEventsPage() {
  return <NsLandingPage slug="events" />;
}
