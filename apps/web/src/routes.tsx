import { Routes, Route, Navigate } from 'react-router-dom';
import EventCatalogPage from './features/discovery/EventCatalogPage';
import CheckoutPage from './features/booking/CheckoutPage';
import PaymentPage from './features/booking/PaymentPage';
import MyTicketsPage from './features/tickets/MyTicketsPage';
import QrPassPage from './features/tickets/QrPassPage';
import ScannerPage from './features/organizer/ScannerPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Discovery & Home */}
      <Route path="/" element={<EventCatalogPage />} />
      <Route path="/events" element={<EventCatalogPage />} />

      {/* Booking & Payment Flow */}
      <Route path="/checkout/:tierId" element={<CheckoutPage />} />
      <Route path="/checkout/:tierId/payment" element={<PaymentPage />} />
      <Route path="/checkout/payment" element={<PaymentPage />} />
      <Route path="/payment/:bookingId" element={<PaymentPage />} />

      {/* Customer Ticket & QR Pass Flow */}
      <Route path="/tickets" element={<MyTicketsPage />} />
      <Route path="/tickets/:id" element={<QrPassPage />} />

      {/* Organizer Scanner Flow */}
      <Route path="/organizer/scanner" element={<ScannerPage />} />
      <Route path="/organizer/scan" element={<ScannerPage />} />
      <Route path="/organizer" element={<ScannerPage />} />
      <Route path="/scanner" element={<ScannerPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
