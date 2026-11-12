/**
 * Formatting helpers for the public web. All event times display in ICT, as the footer promises.
 */
const TZ = 'Asia/Phnom_Penh';

const part = (iso: string, options: Intl.DateTimeFormatOptions) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...options }).format(d);
  } catch {
    return '—';
  }
};

/** "02.12" */
export const dotDate = (iso: string) => `${part(iso, { day: '2-digit' })}.${part(iso, { month: '2-digit' })}`;
/** "WED" */
export const weekdayShort = (iso: string) => part(iso, { weekday: 'short' }).toUpperCase();
/** "DECEMBER" */
export const monthLong = (iso: string) => part(iso, { month: 'long' }).toUpperCase();
/**
 * Lineup heading from the shows listed: "CAMBODIA · NOV–DEC", or "PHNOM PENH · DECEMBER"
 * when they share a city and month.
 */
export function lineupLabel(events: { venue: string; startsAt: string }[]): string {
  if (events.length === 0) return 'CAMBODIA';
  const cities = new Set(events.map((e) => (e.venue.includes(',') ? e.venue.split(',').pop()!.trim() : '')));
  const [onlyCity] = cities;
  const place = cities.size === 1 && onlyCity ? onlyCity.toUpperCase() : 'CAMBODIA';
  const months = [...new Set(events.map((e) => monthLong(e.startsAt)))];
  const first = months[0] ?? '';
  const last = months[months.length - 1] ?? '';
  return `${place} · ${months.length === 1 ? first : `${first.slice(0, 3)}–${last.slice(0, 3)}`}`;
}

/** { day: "02", month: "DEC" } */
export const dayMonth = (iso: string) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { day: '—', month: '' };
    return {
      day: part(iso, { day: '2-digit' }),
      month: part(iso, { month: 'short' }).toUpperCase(),
    };
  } catch {
    return { day: '—', month: '' };
  }
};
/** "Wed 2 Dec 2026" */
export const longDate = (iso: string) =>
  `${part(iso, { weekday: 'short' })} ${part(iso, { day: 'numeric' })} ${part(iso, { month: 'short' })} ${part(iso, { year: 'numeric' })}`;
/** "Wed 2 Dec" */
export const mediumDate = (iso: string) =>
  `${part(iso, { weekday: 'short' })} ${part(iso, { day: 'numeric' })} ${part(iso, { month: 'short' })}`;
/** "7:00 PM" */
export const clockTime = (iso: string) => {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(d);
  } catch {
    return '—';
  }
};

/** Flat per-order fee from the designs. The API doesn't record it yet. */
export const SERVICE_FEE = 2;

export const money = (value: number) => `$${value.toFixed(2)}`;
/** "Free", "$15", or "$15.50" when the price has cents. */
export const shortMoney = (value: number) => (value === 0 ? 'Free' : Number.isInteger(value) ? `$${value}` : money(value));

export const countdown = (seconds: number) => {
  const s = Math.max(0, Math.floor(isNaN(seconds) ? 0 : seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/** Splits "A & B" into its names; long single names, or any when `always`, split into two balanced lines. */
export function titleParts(title: string, always = false): string[] {
  const names = title.split(/\s+&\s+/).map((s) => s.trim()).filter(Boolean);
  if (names.length > 1) return names;
  const words = title.trim().split(/\s+/);
  if (words.length < 2 || (!always && title.length < 14)) return [title.trim()];
  let best = 1;
  let bestGap = Infinity;
  for (let i = 1; i < words.length; i += 1) {
    const gap = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if (gap < bestGap) { bestGap = gap; best = i; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

/** Display lines for a title. Only a real "A & B" title gets an ampersand. */
export function titleLines(title: string): string[] {
  const hasAmpersand = /\s&\s/.test(title);
  return titleParts(title).map((part, i) => (hasAmpersand && i > 0 ? `& ${part}` : part));
}

/** Scales a headline down so longer titles stay inside fixed poster art. */
export const fitSize = (base: number, text: string, fitsChars: number, min = 0.45) =>
  Math.round(base * Math.max(min, Math.min(1, fitsChars / Math.max(1, text.length))));

/** The session only carries an email, so names come from it: "sok.dara@x" → "Sok Dara". */
export function nameFromEmail(email?: string | null): string {
  if (!email) return 'Guest';
  return (email.split('@')[0] ?? '')
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function initialsFromEmail(email?: string | null): string {
  const [first = '', second = ''] = nameFromEmail(email).split(' ');
  return (second ? first.charAt(0) + second.charAt(0) : first.slice(0, 2)).toUpperCase();
}

/** Short, readable ticket code: "ARG-7F3K-29QD". */
export function ticketCode(id: string): string {
  const raw = id.replace(/-/g, '').toUpperCase();
  return `ARG-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

/**
 * Optional running order, written in an event description as lines like
 * "7:30 PM | Opening DJ set". Everything else stays the "about" text.
 */
export function parseDescription(description: string | null | undefined) {
  const about: string[] = [];
  const schedule: { time: string; label: string }[] = [];
  for (const line of (description ?? '').split('\n')) {
    const match = /^\s*(\d{1,2}(?::\d{2})?\s*[AP]M)\s*\|\s*(.+?)\s*$/i.exec(line);
    if (match?.[1] && match[2]) schedule.push({ time: match[1].toUpperCase(), label: match[2] });
    else if (line.trim()) about.push(line.trim());
  }
  return { about: about.join(' '), schedule };
}

/** Holds a customer started but hasn't paid; the API has no "my bookings" list to recover them. */
export interface PendingHold {
  id: string;
  eventTitle: string;
  eventStartsAt: string;
  tierName: string;
  expiresAt: string;
}

const holdsKey = (userId: string) => `argon:holds:${userId}`;

export function readHolds(userId: string): PendingHold[] {
  try {
    const holds = JSON.parse(localStorage.getItem(holdsKey(userId)) ?? '[]') as PendingHold[];
    return holds.filter((h) => new Date(h.expiresAt).getTime() > Date.now());
  } catch {
    return [];
  }
}

export function rememberHold(userId: string, hold: PendingHold) {
  try {
    localStorage.setItem(holdsKey(userId), JSON.stringify([...readHolds(userId).filter((h) => h.id !== hold.id), hold]));
  } catch {
    // Storage is a convenience here; the hold still exists on the server.
  }
}

export function forgetHold(userId: string, id: string) {
  try {
    localStorage.setItem(holdsKey(userId), JSON.stringify(readHolds(userId).filter((h) => h.id !== id)));
  } catch {
    // See rememberHold.
  }
}
