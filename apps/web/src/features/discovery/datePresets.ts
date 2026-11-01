/**
 * features/discovery/datePresets.ts – date filter chips for the event feed.
 * Ranges are computed in the customer's local timezone; weeks end on Sunday.
 */

export const DATE_PRESETS = [
  { value: 'any', label: 'Any date' },
  { value: 'today', label: 'Today' },
  { value: 'weekend', label: 'This weekend' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
] as const;

export type DatePreset = (typeof DATE_PRESETS)[number]['value'];

export function isDatePreset(value: string | null): value is DatePreset {
  return DATE_PRESETS.some((p) => p.value === value);
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

/** The from/to range for a preset, or {} for "any". `from` is never earlier than now. */
export function presetRange(preset: DatePreset, now = new Date()): { from?: string; to?: string } {
  const day = now.getDay(); // 0 = Sunday … 6 = Saturday
  let start = now;
  let end: Date;

  switch (preset) {
    case 'any':
      return {};
    case 'today':
      end = endOfDay(now);
      break;
    case 'weekend':
      // Saturday–Sunday; on Sunday that's just today.
      start = day === 0 ? now : startOfDay(addDays(now, 6 - day));
      end = endOfDay(day === 0 ? now : addDays(now, 7 - day));
      break;
    case 'week':
      end = endOfDay(addDays(now, (7 - day) % 7));
      break;
    case 'month':
      end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      break;
  }

  const from = start < now ? now : start;
  return { from: from.toISOString(), to: end.toISOString() };
}
