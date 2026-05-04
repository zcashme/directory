import NsLandingPage from "../NsLandingPage";
import { buildNsMetadata } from "../nsLandingContent";

export const metadata = buildNsMetadata("office");

export default function NsOfficePage() {
  return <NsLandingPage slug="office" />;
}
