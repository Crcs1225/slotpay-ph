const BUSINESS_TIME_ZONE = "Asia/Manila";

export function localDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}-${parts.find((part) => part.type === "day")?.value}`;
}

export function dateFromManilaKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12));
}

export function localStart(date: Date) {
  const [year, month, day] = localDateKey(date).split("-").map(Number);
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1) - 8 * 60 * 60 * 1000;
}

export function startOfWeek(date: Date) {
  const [year, month, day] = localDateKey(date).split("-").map(Number);
  const utcDate = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  utcDate.setUTCDate(utcDate.getUTCDate() - ((utcDate.getUTCDay() + 6) % 7));
  return utcDate;
}

export function addDays(date: Date, days: number) {
  const [year, month, day] = localDateKey(date).split("-").map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days));
}

export function addWeeks(date: Date, weeks: number) { return addDays(date, weeks * 7); }
export function subDays(date: Date, days: number) { return addDays(date, -days); }
export function subWeeks(date: Date, weeks: number) { return addDays(date, -7 * weeks); }

export function formatDate(date: Date, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-PH", { timeZone: BUSINESS_TIME_ZONE, ...options }).format(date);
}

export function manilaTime(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return { hour: Number(parts.find((part) => part.type === "hour")?.value), minute: Number(parts.find((part) => part.type === "minute")?.value) };
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-PH", { timeZone: BUSINESS_TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(date);
}
