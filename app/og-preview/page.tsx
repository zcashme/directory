import type { Metadata } from "next";
import { notFound } from "next/navigation";
import OgPreviewClient from "./OgPreviewClient";

export const metadata: Metadata = {
  title: "OG Preview | Zcash.me",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OgPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <OgPreviewClient />;
}
