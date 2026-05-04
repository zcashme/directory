import NsLandingPage from "../NsLandingPage";
import { buildNsMetadata } from "../nsLandingContent";

export const metadata = buildNsMetadata("community");

export default function NsCommunityPage() {
  return <NsLandingPage slug="community" />;
}
