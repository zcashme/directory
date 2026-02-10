/**
 * Public thread-app page
 * Displays a public message board where users can post and view messages
 */

import type { Metadata } from "next";
import ThreadPage from "./ThreadPage";
import { getThreadMessages } from "@/lib/thread/getMessages";

export const metadata: Metadata = {
  title: "Thread | Zcash.me",
  description:
    "A public message board for Zcash users to share thoughts and connect with the community.",
};

export const revalidate = 30; // Revalidate every 30 seconds

export default async function ThreadAppPage() {
  // Fetch initial messages on the server
  const initialMessages = await getThreadMessages(50, 0);

  return <ThreadPage initialMessages={initialMessages} />;
}
