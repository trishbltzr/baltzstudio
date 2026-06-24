const MONTH_NAME_PATTERN = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:,\s*\d{4})?(?:\s+at\s+.+)?$/i;

export function currentDashboardTimestamp(date = new Date()) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeDashboardDate(raw: string) {
  let clean = raw.trim().replace(/^Requested\s+/, "");
  if (!clean) return { value: "", hasTime: false };
  if (/^now$/i.test(clean)) return { value: currentDashboardTimestamp(), hasTime: true };

  const hasTime = /\b(?:at\s+)?\d{1,2}:\d{2}\s*(?:AM|PM)?\b/i.test(clean) || /T\d{2}:\d{2}/.test(clean);
  clean = clean.replace(/\s+at\s+/, " ");

  if (MONTH_NAME_PATTERN.test(clean) && !/,\s*\d{4}/.test(clean)) {
    clean = clean.replace(/^(.*?)(\s+\d{1,2})(\s+|$)/, `$1$2, ${new Date().getFullYear()}$3`);
  }

  return { value: clean, hasTime };
}

function parseDashboardDate(raw?: string) {
  if (!raw) return null;
  const normalized = normalizeDashboardDate(raw);
  if (!normalized.value) return null;
  const parsed = new Date(normalized.value);
  if (Number.isNaN(parsed.getTime())) return null;
  return { date: parsed, hasTime: normalized.hasTime };
}

export function sortDashboardDate(raw?: string) {
  return parseDashboardDate(raw)?.date.getTime() ?? 0;
}

export function formatDashboardDate(raw?: string, fallback = "No date", now = new Date()) {
  const parsed = parseDashboardDate(raw);
  if (!parsed) {
    return raw?.trim()
      ? raw.trim().replace(/^Requested\s+/, "").replace(/,\s*\d{4}/g, "").replace(/\s+at\s+.+$/, "")
      : fallback;
  }

  const diffMs = now.getTime() - parsed.date.getTime();
  const absMs = Math.abs(diffMs);
  const isPast = diffMs >= 0;

  if (parsed.hasTime && absMs < 24 * 60 * 60 * 1000) {
    const minutes = Math.floor(absMs / (60 * 1000));
    if (minutes < 1) return "Now";
    if (minutes < 60) return isPast ? `${minutes}m ago` : `in ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return isPast ? `${hours}h ago` : `in ${hours}h`;
  }

  return parsed.date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
