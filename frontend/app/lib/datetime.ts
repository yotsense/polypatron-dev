import { UITimezone } from "../context/TimezoneContext";

function normalizeDateInput(input: string | Date) {
  if (input instanceof Date) return input;

  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(input);
  const raw = hasTimezone ? input : `${input}Z`;
  return new Date(raw);
}

export function formatDateTime(input: string | Date | null | undefined, tz: UITimezone): string {
  if (!input) return "-";

  const date = normalizeDateInput(input);
  if (Number.isNaN(date.getTime())) return "-";

  const fmt = new Intl.DateTimeFormat("es-MX", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const parts = fmt.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const dayPeriod = (map.dayPeriod || "").toUpperCase();

  return `${map.day}/${map.month}/${map.year}, ${map.hour}:${map.minute}:${map.second} ${dayPeriod}`.trim();
}

export function formatDateTimeParts(input: string | Date | null | undefined, tz: UITimezone) {
  const full = formatDateTime(input, tz);
  if (full === "-") {
    return { date: "-", time: "-" };
  }

  const [date, time] = full.split(", ");
  return {
    date: date || "-",
    time: time || "-",
  };
}
