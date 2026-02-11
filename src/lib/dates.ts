export function formatLocalYmd(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

export function formatLocalHms(timeZone: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  const s = parts.find((p) => p.type === "second")?.value ?? "00";
  return `${h}:${m}:${s}`;
}

export function addDaysYmd(ymd: string, days: number) {
  const t = Date.parse(`${ymd}T00:00:00Z`);
  const out = new Date(t + days * 86400000);
  const y = out.getUTCFullYear();
  const m = String(out.getUTCMonth() + 1).padStart(2, "0");
  const d = String(out.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function diffDaysYmd(a: string, b: string) {
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  return Math.round((ta - tb) / 86400000);
}

export function getTodayDayNumber({
  startDate,
  timeZone,
  now = new Date(),
}: {
  startDate: string; // YYYY-MM-DD
  timeZone: string;
  now?: Date;
}) {
  const today = formatLocalYmd(timeZone, now);
  return diffDaysYmd(today, startDate) + 1;
}

export function isEditableClient({
  startDate,
  timeZone,
  cutoffTime,
  dayNumber,
  now = new Date(),
}: {
  startDate: string;
  timeZone: string;
  cutoffTime: string; // HH:MM:SS
  dayNumber: number;
  now?: Date;
}) {
  const today = formatLocalYmd(timeZone, now);
  const dayYmd = addDaysYmd(startDate, dayNumber - 1);
  if (dayYmd !== today) return false;
  const localNow = formatLocalHms(timeZone, now);
  return localNow < cutoffTime;
}

