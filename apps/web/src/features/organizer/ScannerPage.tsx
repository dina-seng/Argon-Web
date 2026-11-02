import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { api, ApiRequestError } from '../../lib/api';
import {
  QrCode,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Zap,
  Volume2,
  VolumeX,
  History
} from 'lucide-react';

/** Shape returned by POST /checkin/scan (see apps/api/src/modules/checkin/service.ts). */
interface ScanResult {
  outcome: 'CHECKED_IN' | 'DUPLICATE' | 'REVOKED' | 'INVALID';
  statusCode: number;
  checkedInAt?: string;
  priorCheckedInAt?: string;
  holderName?: string;
  eventTitle?: string;
  tierName?: string;
  message?: string;
}

interface AuditLogEntry {
  id: string;
  token: string;
  outcome: string;
  message: string;
  timestamp: number;
}

let logId = 0;

export default function ScannerPage() {
  const location = useLocation();

  const [inputToken, setInputToken] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [scannedCheckedIn, setScannedCheckedIn] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Read ?token= query parameter if passed from ticket page
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setInputToken(tokenParam);
      handlePerformScan(tokenParam);
    }
  }, [location.search]);

  // Audio feedback synthesizer
  const playSound = useCallback((type: 'success' | 'duplicate' | 'error') => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'duplicate') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.setValueAtTime(240, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // AudioContext not allowed or unsupported
    }
  }, [soundEnabled]);

  // Perform ticket scan against real backend
  const handlePerformScan = useCallback(async (tokenToScan: string) => {
    if (!tokenToScan.trim()) return;

    try {
      const result = await api.post<ScanResult>('/checkin/scan', { qrToken: tokenToScan });
      const full: ScanResult = { ...result, statusCode: 200 };
      setScanResult(full);

      if (full.outcome === 'CHECKED_IN') {
        playSound('success');
        setScannedCheckedIn((c) => c + 1);
      }

      setAuditLogs((prev) => [
        {
          id: `log-${++logId}`,
          token: tokenToScan,
          outcome: full.outcome,
          message: full.message ?? full.outcome,
          timestamp: Date.now(),
        },
        ...prev,
      ]);
    } catch (err) {
      // 409 = DUPLICATE, 400 = INVALID / REVOKED
      if (err instanceof ApiRequestError) {
        const data = err.data as Partial<ScanResult> | undefined;
        const result: ScanResult = {
          outcome: (data?.outcome as ScanResult['outcome']) ?? 'INVALID',
          statusCode: err.status,
          checkedInAt: data?.checkedInAt,
          priorCheckedInAt: data?.priorCheckedInAt,
          holderName: data?.holderName,
          eventTitle: data?.eventTitle,
          tierName: data?.tierName,
          message: data?.message ?? err.message,
        };
        setScanResult(result);

        if (result.outcome === 'DUPLICATE') {
          playSound('duplicate');
        } else {
          playSound('error');
        }

        setAuditLogs((prev) => [
          {
            id: `log-${++logId}`,
            token: tokenToScan,
            outcome: result.outcome,
            message: result.message ?? result.outcome,
            timestamp: Date.now(),
          },
          ...prev,
        ]);
      } else {
        setScanResult({
          outcome: 'INVALID',
          statusCode: 0,
          message: err instanceof Error ? err.message : 'Network error',
        });
        playSound('error');
      }
    }
  }, [playSound]);

  // Camera toggle handler
  const toggleCamera = async () => {
    if (cameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
      setCameraError(null);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
        setCameraError(null);
      } catch (err) {
        console.warn('Camera access unavailable:', err);
        setCameraError('Camera not available or permission denied. Use one-click simulation below.');
        setCameraActive(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#090a10] text-zinc-100 flex flex-col font-sans">
      {/* Inline header for scanner page */}
      <header className="border-b border-white/[0.07] bg-[#0c0d14]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="font-display text-2xl font-black tracking-tight text-white group-hover:text-primary-300 transition-colors">
              argon
            </span>
            <span className="w-5 h-1 rounded-full bg-gradient-to-r from-cyan-400 via-primary-500 to-fuchsia-500 shadow-[0_0_8px_rgba(120,87,255,0.8)]" />
          </Link>
          <Link to="/organizer" className="text-xs text-purple-300 hover:text-purple-200 transition">
            ← Organizer Dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-purple-950/80 text-purple-300 border border-purple-800/60">
                Staff Check-In Gate
              </span>
              <span className="text-zinc-500 text-xs">Phnom Penh Venue Entry</span>
            </div>
            <h1 className="font-display text-3xl font-extrabold text-white mt-1">
              Organizer QR Ticket Scanner
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">
              Verify customer QR tickets, record admission timestamps, and prevent duplicate check-ins.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3">
            <div className="bg-[#12131b] border border-white/[0.08] px-3.5 py-2 rounded-xl text-center">
              <span className="block text-[10px] text-zinc-500 uppercase font-bold">Checked In</span>
              <span className="text-lg font-bold text-purple-400">{scannedCheckedIn}</span>
            </div>
            <div className="bg-[#12131b] border border-white/[0.08] px-3.5 py-2 rounded-xl text-center">
              <span className="block text-[10px] text-zinc-500 uppercase font-bold">Scans Today</span>
              <span className="text-lg font-bold text-emerald-400">{auditLogs.length}</span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute scanner chime' : 'Enable scanner chime'}
              className="p-2 rounded-xl bg-[#12131b] border border-white/[0.08] text-zinc-400 hover:text-white transition"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Scanner Viewport & Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Viewfinder & Quick Simulator */}
          <div className="lg:col-span-7 space-y-6">
            {/* Viewfinder Card */}
            <div className="bg-[#12131b] border border-white/[0.08] rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-purple-400" />
                  Live Gate Viewfinder
                </span>
                <button
                  onClick={toggleCamera}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                    cameraActive
                      ? 'bg-red-950/60 text-red-300 border border-red-800/60'
                      : 'bg-purple-950/60 text-purple-300 border border-purple-800/60 hover:bg-purple-900/60'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{cameraActive ? 'Stop Camera' : 'Start Device Camera'}</span>
                </button>
              </div>

              {/* Viewfinder Screen */}
              <div className="w-full aspect-[4/3] rounded-xl bg-black relative overflow-hidden border border-zinc-800 flex items-center justify-center">
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6 text-zinc-500">
                    <QrCode className="w-16 h-16 text-zinc-700 mx-auto mb-2 animate-pulse" />
                    <p className="text-xs text-zinc-400 font-medium">Ready for QR Ticket</p>
                    <p className="text-[11px] text-zinc-600 mt-1">
                      Align QR code inside scanning target, or use instant simulation buttons below
                    </p>
                  </div>
                )}

                {/* Laser scan line overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center">
                  <div className="w-48 sm:w-56 h-48 sm:h-56 border-2 border-purple-500/70 rounded-2xl relative">
                    {/* Corner Reticles */}
                    <span className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-purple-400" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-purple-400" />
                    <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-purple-400" />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-purple-400" />
                    {/* Animated Scanning Beam */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#38bdf8] animate-bounce mt-24" />
                  </div>
                </div>

                {cameraError && (
                  <div className="absolute bottom-2 left-2 right-2 bg-zinc-900/90 text-amber-300 text-[11px] p-2 rounded border border-amber-900/50 text-center">
                    {cameraError}
                  </div>
                )}
              </div>

              {/* Manual QR Input Form */}
              <div className="mt-5">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (inputToken.trim()) {
                      handlePerformScan(inputToken.trim());
                    }
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={inputToken}
                      onChange={(e) => setInputToken(e.target.value)}
                      placeholder="Enter QR token to scan..."
                      className="w-full bg-[#181926] border border-zinc-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#7857ff] hover:bg-[#6b47ff] text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shrink-0"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Verify</span>
                  </button>
                </form>
              </div>

              {/* Instant One-Click Test Simulation Scenarios */}
              <div className="mt-6 pt-5 border-t border-zinc-800/80">
                <span className="text-xs font-semibold text-zinc-300 block mb-2.5">
                  Test with a real QR token (paste from a ticket):
                </span>
                <p className="text-[11px] text-zinc-500 mb-2">
                  The scanner calls <code className="text-zinc-400">POST /checkin/scan</code> on the real backend.
                  Paste a valid QR token from any ticket pass page to test check-in.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Scan Result & Real-Time Audit Log */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Scan Result Card */}
            <div className="bg-[#12131b] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
              <h2 className="text-sm font-semibold text-white mb-4 flex items-center justify-between">
                <span>Gate Scan Result</span>
                {scanResult && (
                  <span className="font-mono text-[11px] text-zinc-500">
                    HTTP {scanResult.statusCode}
                  </span>
                )}
              </h2>

              {!scanResult ? (
                <div className="py-12 px-4 text-center border-2 border-dashed border-zinc-800 rounded-xl">
                  <QrCode className="w-10 h-10 text-zinc-700 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400 font-medium">Awaiting scan</p>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Point camera at attendee pass or enter a QR token
                  </p>
                </div>
              ) : scanResult.outcome === 'CHECKED_IN' ? (
                /* SUCCESS RESULT */
                <div className="bg-emerald-950/30 border border-emerald-500/50 rounded-xl p-5 animate-in zoom-in-95">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center shrink-0 text-emerald-400">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-700">
                        VALID · CHECKED IN
                      </span>
                      <h3 className="font-display text-xl font-bold text-white mt-1.5">
                        {scanResult.holderName ?? 'Attendee'}
                      </h3>
                      <p className="text-xs text-emerald-300 font-medium">
                        {scanResult.eventTitle ?? 'Event'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-emerald-900/40 space-y-1.5 text-xs text-zinc-300 font-sans">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Tier:</span>
                      <span className="text-white">{scanResult.tierName ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Admission:</span>
                      <span className="text-emerald-400 font-medium">1 guest admitted</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Timestamp:</span>
                      <span className="font-mono text-zinc-300">
                        {scanResult.checkedInAt ? new Date(scanResult.checkedInAt).toLocaleTimeString() : new Date().toLocaleTimeString()} ICT
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-emerald-900/40">
                    <span className="text-[11px] text-emerald-400">
                      ✓ Status updated in database
                    </span>
                  </div>
                </div>
              ) : scanResult.outcome === 'DUPLICATE' ? (
                /* DUPLICATE CONFLICT (409) */
                <div className="bg-amber-950/30 border border-amber-500/60 rounded-xl p-5 animate-in zoom-in-95">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center shrink-0 text-amber-400">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-amber-950 text-amber-300 border border-amber-700">
                        409 CONFLICT · DUPLICATE SCAN
                      </span>
                      <h3 className="font-display text-lg font-bold text-white mt-1.5">
                        Entry Already Used!
                      </h3>
                      <p className="text-xs text-amber-300">
                        {scanResult.holderName ?? 'Attendee'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 bg-black/40 p-3 rounded-lg border border-amber-900/50 text-xs text-amber-200/90 leading-relaxed">
                    <p className="font-semibold text-amber-300">Fraud Prevention Warning:</p>
                    <p className="mt-1">
                      This ticket was already checked in at{' '}
                      <span className="font-mono font-bold text-white">
                        {scanResult.priorCheckedInAt
                          ? new Date(scanResult.priorCheckedInAt).toLocaleTimeString()
                          : 'earlier today'}
                      </span>
                      . Duplicate scans are blocked by security policy.
                    </p>
                  </div>
                </div>
              ) : (
                /* INVALID / REVOKED RESULT */
                <div className="bg-red-950/30 border border-red-500/50 rounded-xl p-5 animate-in zoom-in-95">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-400 flex items-center justify-center shrink-0 text-red-400">
                      <XCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-red-950 text-red-300 border border-red-800">
                        {scanResult.outcome === 'REVOKED' ? 'REVOKED' : 'REJECTED'}
                      </span>
                      <h3 className="font-display text-lg font-bold text-white mt-1.5">
                        Check-in Refused
                      </h3>
                      <p className="text-xs text-red-300 mt-1">{scanResult.message}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Check-In Audit Logs */}
            <div className="bg-[#12131b] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <History className="w-4 h-4 text-zinc-400" />
                  Recent Gate Activity
                </span>
                <span className="text-[11px] font-mono text-zinc-500">This session</span>
              </div>

              {auditLogs.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-6">No scans yet</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-black/30 border border-zinc-800/80 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        {log.outcome === 'CHECKED_IN' ? (
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        ) : log.outcome === 'DUPLICATE' ? (
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-red-400" />
                        )}
                        <div>
                          <span className="font-mono font-medium text-white mr-1.5">
                            {log.token.slice(0, 12)}
                          </span>
                          <span className="text-zinc-400">{log.message}</span>
                        </div>
                      </div>

                      <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
