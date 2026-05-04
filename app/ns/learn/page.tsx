import NsLandingPage from "../NsLandingPage";
import { buildNsMetadata } from "../nsLandingContent";

export const metadata = buildNsMetadata("learn");

export default function NsLearnPage() {
  return <NsLandingPage slug="learn" />;
}
