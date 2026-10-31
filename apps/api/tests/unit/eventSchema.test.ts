/**
 * tests/unit/eventSchema.test.ts – Validation rules for the organizer event form.
 */

import { describe, it, expect } from 'vitest';
import {
  EventCategory,
  createEventSchema,
  listEventsQuerySchema,
  updateEventSchema,
  updateEventStatusSchema,
} from '@argon/shared';

const inAWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const validEvent = {
  title: 'Phnom Penh Jazz Night',
  description: 'Live jazz by the river.',
  venue: 'Riverside Hall, Phnom Penh',
  startsAt: inAWeek,
  category: EventCategory.MUSIC,
  capacity: 200,
};

describe('createEventSchema', () => {
  it('accepts a complete event', () => {
    expect(createEventSchema.safeParse(validEvent).success).toBe(true);
  });

  it('coerces capacity from a form string', () => {
    const result = createEventSchema.safeParse({ ...validEvent, capacity: '150' });
    expect(result.success && result.data.capacity).toBe(150);
  });

  it.each([
    ['title', { title: '   ' }],
    ['venue', { venue: '' }],
    ['startsAt', { startsAt: 'not a date' }],
    ['startsAt', { startsAt: new Date(Date.now() - 60_000).toISOString() }],
    ['capacity', { capacity: 0 }],
    ['capacity', { capacity: 1.5 }],
    ['category', { category: 'PARTY' }],
  ])('rejects invalid %s', (field, override) => {
    const result = createEventSchema.safeParse({ ...validEvent, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path[0]).toBe(field);
  });
});

describe('updateEventSchema', () => {
  it('accepts a partial update without a date', () => {
    expect(updateEventSchema.safeParse({ description: 'Updated' }).success).toBe(true);
  });

  it('rejects moving the event into the past', () => {
    expect(updateEventSchema.safeParse({ startsAt: '2000-01-01T00:00:00.000Z' }).success).toBe(false);
  });
});

describe('updateEventStatusSchema', () => {
  it('only allows publish and cancel', () => {
    expect(updateEventStatusSchema.safeParse({ status: 'PUBLISHED' }).success).toBe(true);
    expect(updateEventStatusSchema.safeParse({ status: 'CANCELLED' }).success).toBe(true);
    expect(updateEventStatusSchema.safeParse({ status: 'COMPLETED' }).success).toBe(false);
  });
});

describe('listEventsQuerySchema', () => {
  it('defaults to the first page of 12', () => {
    expect(listEventsQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 12 });
  });

  it('coerces paging from query strings and accepts filters', () => {
    const result = listEventsQuerySchema.parse({ page: '2', pageSize: '24', category: 'FOOD', q: ' jazz ', from: inAWeek });
    expect(result).toMatchObject({ page: 2, pageSize: 24, category: 'FOOD', q: 'jazz' });
  });

  it.each([{ category: 'PARTY' }, { pageSize: '500' }, { page: '0' }, { from: 'tomorrow' }])('rejects %o', (query) => {
    expect(listEventsQuerySchema.safeParse(query).success).toBe(false);
  });
});
