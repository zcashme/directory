import NsLandingPage from "../NsLandingPage";
import { buildNsMetadata } from "../nsLandingContent";

export const metadata = buildNsMetadata("ux");

export default function NsUxPage() {
  return <NsLandingPage slug="ux" />;
}
