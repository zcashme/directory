export function buildZcashEditMemo(profile = {}, zId = "?", requestId = null) {
  const fieldMap = {
    name: "n",
    display_name: "h",
    bio: "b",
    profile_image_url: "i",
    links: "l",
  };

  const clean = Object.fromEntries(
    Object.entries(profile).filter(([, v]) => {
      if (Array.isArray(v)) return v.some((x) => x && x.trim() !== "");
      return v !== "" && v !== null && v !== undefined;
    })
  );

  const includeAddress = "address" in clean && clean.address.trim() !== "";

  const compactPairs = Object.entries(clean)
    .filter(([k]) => k !== "address")
    .map(([key, value]) => {
      const shortKey = fieldMap[key] || key;
      if (Array.isArray(value)) {
        return `${shortKey}:[${value
          .filter((x) => x && x.trim() !== "")
          .map((x) => `"${x}"`)
          .join(",")}]`;
      }
      return `${shortKey}:"${value}"`;
    });

  const requestIdPart = requestId ? `,rid:${requestId}` : "";

  return compactPairs.length > 0 || includeAddress || requestId
    ? `{z:${zId}${requestIdPart}${includeAddress ? `,a:"${clean.address.trim()}"` : ""}${compactPairs.length ? `,${compactPairs.join(",")}` : ""}}`
    : `{z:${zId}}`;
}
