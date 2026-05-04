import NsLandingPage from "../NsLandingPage";
import { buildNsMetadata } from "../nsLandingContent";

export const metadata = buildNsMetadata("accept");

export default function NsAcceptPage() {
  return <NsLandingPage slug="accept" />;
}
