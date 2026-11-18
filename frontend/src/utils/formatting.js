/**
 * Kuwait regional formatting utilities
 */

export function fmtKWD(amount) {
  const val = Number(amount || 0);
  return val.toLocaleString("en-KW", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  }) + " KWD";
}

export function fmtDate(isoDateStr) {
  if (!isoDateStr) return "N/A";
  const d = new Date(isoDateStr);
  if (isNaN(d.getTime())) return isoDateStr;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function fmtDateTime(isoDateTimeStr) {
  if (!isoDateTimeStr) return "N/A";
  const d = new Date(isoDateTimeStr);
  if (isNaN(d.getTime())) return isoDateTimeStr;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
