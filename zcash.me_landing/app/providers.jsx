"use client";

import { FeedbackProvider } from "../src/store";

export default function Providers({ children }) {
  return <FeedbackProvider>{children}</FeedbackProvider>;
}
