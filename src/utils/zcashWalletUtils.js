export function buildZcashUri(address, amount = "0", memo = "") {
  if (!address) return "";
  const base = `zcash:${address}`;
  const params = [];
  if (amount && Number(amount) > 0) params.push(`amount=${amount}`);
  if (memo) params.push(`memo=${toBase64Url(memo)}`);
  return params.length ? `${base}?${params.join("&")}` : base;
}

export function toBase64Url(text) {
  try {
    return btoa(unescape(encodeURIComponent(text)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return "";
  }
}

export function isValidZcashAddress(addr) {
  return typeof addr === "string" && /^u[0-9a-z]{60,}$/i.test(addr);
}
