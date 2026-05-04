import NsLandingPage from "../NsLandingPage";
import { buildNsMetadata } from "../nsLandingContent";

export const metadata = buildNsMetadata("start");

export default function NsStartPage() {
  return <NsLandingPage slug="start" />;
}
