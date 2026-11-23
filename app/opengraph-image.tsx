import { contentType, renderProfileOgImage, size } from "@/lib/og/renderProfileOg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export { size, contentType };

export default function OpenGraphImage() {
  return renderProfileOgImage();
}
