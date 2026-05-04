"use client";

import { useEffect } from "react";

const NS_BACKGROUND = "#f7f7f2";

export default function NsThemeEffect() {
  useEffect(() => {
    const previousBodyBackground = document.body.style.backgroundColor;
    const previousHtmlBackground = document.documentElement.style.backgroundColor;
    const previousColorBackgroundVar = document.documentElement.style.getPropertyValue("--color-background");

    document.body.style.backgroundColor = NS_BACKGROUND;
    document.documentElement.style.backgroundColor = NS_BACKGROUND;
    document.documentElement.style.setProperty("--color-background", NS_BACKGROUND);

    return () => {
      document.body.style.backgroundColor = previousBodyBackground;
      document.documentElement.style.backgroundColor = previousHtmlBackground;
      if (previousColorBackgroundVar) {
        document.documentElement.style.setProperty("--color-background", previousColorBackgroundVar);
      } else {
        document.documentElement.style.removeProperty("--color-background");
      }
    };
  }, []);

  return null;
}
