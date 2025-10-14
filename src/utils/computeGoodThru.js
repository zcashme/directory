export default function computeGoodThru(since, lastSigned) {
  const sinceDate = since ? new Date(since) : null;
  const lastSignedDate = lastSigned ? new Date(lastSigned) : null;
  const latest = lastSignedDate && sinceDate
    ? (lastSignedDate > sinceDate ? lastSignedDate : sinceDate)
    : (lastSignedDate || sinceDate);
  return latest ? new Date(latest.getTime() + 60 * 24 * 60 * 60 * 1000) : null;
}
