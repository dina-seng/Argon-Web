import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CameraViewfinder } from './features/scan/CameraViewfinder';
import { ScanResultScreen } from './features/scan/ScanResultScreen';
import RosterPage from './features/roster/RosterPage';

/**
 * Scanner App – staff gate PWA.
 */

const PlaceholderPage = ({ name }: { name: string }) => (
  <div style={{ display: 'flex', minHeight: '100dvh', alignItems: 'center', justifyContent: 'center', background: '#0d0f1a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Argon Scanner</h1>
      <p style={{ color: '#888', marginTop: '0.5rem' }}>{name} – placeholder</p>
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CameraViewfinder />} />
        <Route path="/login" element={<PlaceholderPage name="Staff Login" />} />
        <Route path="/scan/result" element={<ScanResultScreen outcome="INVALID" />} />
        <Route path="/roster" element={<RosterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
