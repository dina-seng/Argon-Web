/**
 * lib/eventLabels.ts – display labels for event enums, shared by organizer and discovery pages.
 */

import { EventCategory, EventStatus } from '@argon/shared';

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  [EventCategory.MUSIC]: 'Music',
  [EventCategory.SPORTS]: 'Sports',
  [EventCategory.FOOD]: 'Food & Drink',
  [EventCategory.ARTS]: 'Arts & Culture',
  [EventCategory.TECH]: 'Tech',
  [EventCategory.OTHER]: 'Other',
};

export const STATUS_BADGES: Record<EventStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'default' }> = {
  [EventStatus.DRAFT]: { label: 'Draft', variant: 'warning' },
  [EventStatus.PUBLISHED]: { label: 'Published', variant: 'success' },
  [EventStatus.CANCELLED]: { label: 'Cancelled', variant: 'error' },
  [EventStatus.COMPLETED]: { label: 'Completed', variant: 'default' },
};

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatEventDate(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

const shortDateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

/** Compact date for cards, e.g. "Sat, 7 Nov · 7:00 PM". */
export function formatEventDateShort(iso: string): string {
  const d = new Date(iso);
  return `${shortDateFormat.format(d)} · ${timeFormat.format(d)}`;
}

const priceFormat = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });

export function formatPrice(price: number): string {
  return price === 0 ? 'Free' : priceFormat.format(price);
}
