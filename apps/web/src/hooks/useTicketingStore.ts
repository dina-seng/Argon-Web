import { useSyncExternalStore } from 'react';
import { ticketingStore } from '../lib/ticketingStore';

export function useTicketingStore() {
  const state = useSyncExternalStore(
    ticketingStore.subscribe,
    ticketingStore.getState,
    ticketingStore.getState
  );

  return {
    state,
    user: state.user,
    events: state.events,
    bookings: state.bookings,
    tickets: state.tickets,
    activeRole: state.activeRole,
    scanAuditLogs: state.scanAuditLogs,
    createPendingBooking: ticketingStore.createPendingBooking,
    confirmPayment: ticketingStore.confirmPayment,
    cancelBooking: ticketingStore.cancelBooking,
    scanTicket: ticketingStore.scanTicket,
    resetDefaults: ticketingStore.resetDefaults,
    setActiveRole: ticketingStore.setActiveRole,
  };
}
