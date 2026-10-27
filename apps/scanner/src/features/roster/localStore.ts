/**
 * features/roster/localStore.ts
 *
 * Roster contains ticket identifiers and status only.
 * NEVER ship the QR signing secret to the client.
 * Offline mode validates against the encrypted local roster,
 * then syncs check-in timestamps on reconnect.
 * Resolve conflicts server-side (first check-in wins).
 *
 * TODO: Implement using IndexedDB (via idb library).
 * TODO: Encrypt the roster at rest using the Web Crypto API with a session-derived key.
 * TODO: Provide getRosterEntry(qrToken), upsertEntry(), clearRoster() APIs.
 */

import type { RosterEntry } from '@argon/shared';

export async function getRosterEntry(_qrToken: string): Promise<RosterEntry | null> {
  // TODO: implement IndexedDB lookup
  throw new Error('Not implemented');
}

export async function upsertRosterEntry(_entry: RosterEntry): Promise<void> {
  // TODO: implement IndexedDB upsert
  throw new Error('Not implemented');
}

export async function clearRoster(): Promise<void> {
  // TODO: implement
  throw new Error('Not implemented');
}
