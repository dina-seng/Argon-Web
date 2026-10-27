/**
 * features/sync/offlineQueue.ts
 *
 * Queue offline check-ins, upload on reconnect.
 * Conflict resolution: server-side, first check-in wins.
 *
 * TODO: Store pending check-in events in IndexedDB.
 * TODO: Register a Background Sync event (if ServiceWorker supports it) or use
 *       navigator.onLine + window 'online' event listener as fallback.
 * TODO: On sync, POST /checkin/scan for each queued entry and mark as synced.
 */

export interface OfflineCheckin {
  ticketId: string;
  qrToken: string;
  scannedAt: string; // ISO timestamp
  synced: boolean;
}

export async function enqueueCheckin(_entry: Omit<OfflineCheckin, 'synced'>): Promise<void> {
  // TODO: implement
  throw new Error('Not implemented');
}

export async function flushQueue(): Promise<void> {
  // TODO: implement – POST each pending entry to /checkin/scan
  throw new Error('Not implemented');
}
