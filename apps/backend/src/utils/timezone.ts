const SAO_PAULO_TZ = 'America/Sao_Paulo';

function parseOffsetMinutes(offsetLabel: string): number {
  const match = offsetLabel.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/i);
  if (!match) return -180; // fallback São Paulo UTC-3
  const hours = Number(match[1]);
  const minutes = Number(match[2] || '0');
  return (hours * 60) + (hours >= 0 ? minutes : -minutes);
}

function getOffsetMinutesForTimeZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT-3';
  return parseOffsetMinutes(tzPart);
}

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
  };
}

function zonedDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  timeZone: string
): Date {
  const roughUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));
  const offsetMinutes = getOffsetMinutesForTimeZone(roughUtc, timeZone);
  return new Date(roughUtc.getTime() - offsetMinutes * 60_000);
}

export function getSaoPauloDayRange(reference = new Date()) {
  const { year, month, day } = getDatePartsInTimeZone(reference, SAO_PAULO_TZ);
  const start = zonedDateTimeToUtc(year, month, day, 0, 0, 0, 0, SAO_PAULO_TZ);
  const end = zonedDateTimeToUtc(year, month, day, 23, 59, 59, 999, SAO_PAULO_TZ);
  return { start, end };
}

export function formatSaoPauloDateTime(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: SAO_PAULO_TZ,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

