import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../lib/api';

export interface SystemHealthResponse {
  status: 'OPERATIONAL' | 'DEGRADED';
  timestamp: string;
  uptime: number;
  nodeVersion: string;
  platform: string;
  arch: string;
  memory: {
    rssMb: number;
    heapTotalMb: number;
    heapUsedMb: number;
  };
  database: {
    status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    latencyMs: number;
    activeConnections: number;
    poolProvider: string;
    counts: {
      users: number;
      events: number;
      bookings: number;
      tickets: number;
      auditLogs: number;
    };
  };
  cache: {
    status: 'HEALTHY' | 'DISCONNECTED' | 'DISABLED';
    latencyMs: number;
    usedMemory: string;
    engine: string;
  };
  services: Array<{
    name: string;
    status: string;
    latencyMs: number;
  }>;
}

export function SystemHealthView() {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  const fetchHealth = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      let res: SystemHealthResponse;
      try {
        res = await api.get<SystemHealthResponse>('/api/v1/admin/system/health');
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('404')) {
          res = await api.get<SystemHealthResponse>('/admin/system/health');
        } else {
          throw err;
        }
      }
      setHealth(res);
      setLastCheckTime(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to query system health diagnostics.';
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(() => fetchHealth(true), 15000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (days > 0) return `${days}d ${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/70 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white">
              System Health & Diagnostics
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
              {health?.status === 'OPERATIONAL' ? 'All Systems Operational' : 'Degraded Performance'}
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Live status for database, cache, runtime memory, and system services.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {lastCheckTime && (
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Updated at {lastCheckTime}
            </span>
          )}
          <Button
            variant="secondary"
            size="md"
            onClick={() => fetchHealth(true)}
            isLoading={isRefreshing}
            className="flex items-center gap-2 rounded-2xl bg-white dark:bg-[#131926] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <svg
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-[#FF5B22]' : 'text-slate-500 dark:text-slate-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="font-semibold text-xs">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={() => fetchHealth(true)}>
            Try Again
          </Button>
        </div>
      )}

      {/* Initial Loading Skeleton */}
      {isLoading && !health && (
        <div className="py-16 text-center text-slate-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF5B22] border-t-transparent mx-auto mb-2" />
          <span className="text-xs font-mono">Checking system health...</span>
        </div>
      )}

      {/* Top Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Node 1: PostgreSQL */}
        <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Database
            </span>
            <Badge
              label={health?.database.status === 'HEALTHY' ? 'ONLINE' : (health?.database.status ?? 'CHECKING')}
              variant={health?.database.status === 'HEALTHY' ? 'success' : 'error'}
            />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-display">
              {health ? `${health.database.latencyMs} ms` : '—'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Response Time</div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Connection</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Active</span>
            </div>
            <div className="flex justify-between">
              <span>Engine</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                PostgreSQL 16
              </span>
            </div>
          </div>
        </div>

        {/* Node 2: Redis Cache */}
        <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Cache
            </span>
            <Badge
              label={health?.cache.status === 'HEALTHY' ? 'ONLINE' : (health?.cache.status ?? 'CHECKING')}
              variant={health?.cache.status === 'HEALTHY' ? 'success' : 'warning'}
            />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-display">
              {health ? `${health.cache.latencyMs} ms` : '—'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Response Time</div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Memory Used</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {health?.cache.usedMemory ?? 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Engine</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Redis 7.2</span>
            </div>
          </div>
        </div>

        {/* Node 3: Fastify Runtime */}
        <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              API Server
            </span>
            <Badge label="NODE.JS" variant="default" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-display">
              {health ? formatUptime(health.uptime) : '—'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Uptime</div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Node Version</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {health?.nodeVersion ?? 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>System</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {health?.platform} ({health?.arch})
              </span>
            </div>
          </div>
        </div>

        {/* Node 4: Memory Profile */}
        <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Memory Usage
            </span>
            <Badge label="NORMAL" variant="info" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white font-display">
              {health ? `${health.memory.heapUsedMb} MB` : '—'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Heap In Use</div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Total Memory (RSS)</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {health?.memory.rssMb} MB
              </span>
            </div>
            <div className="flex justify-between">
              <span>Allocated Heap</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {health?.memory.heapTotalMb} MB
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Database Record Counts */}
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Database Records
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Total records currently stored in the database.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          {[
            { label: 'Users', count: health?.database.counts.users ?? 0 },
            { label: 'Events', count: health?.database.counts.events ?? 0 },
            { label: 'Bookings', count: health?.database.counts.bookings ?? 0 },
            { label: 'Tickets', count: health?.database.counts.tickets ?? 0 },
            { label: 'Audit Logs', count: health?.database.counts.auditLogs ?? 0 },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40"
            >
              <div className="text-xs text-slate-500 dark:text-slate-400">{item.label}</div>
              <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-1">
                {item.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Service Health Checklist */}
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Service Health
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Live status and response times for core services.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {(health?.services ?? []).map((srv) => {
            const isHealthy = srv.status === 'HEALTHY' || srv.status === 'OPERATIONAL';
            return (
              <div
                key={srv.name}
                className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      isHealthy
                        ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                        : 'bg-amber-500 shadow-sm shadow-amber-500/50'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {srv.name}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-400 font-mono mt-0.5">
                      {srv.latencyMs} ms response time
                    </div>
                  </div>
                </div>

                <Badge
                  label={isHealthy ? 'Healthy' : srv.status}
                  variant={isHealthy ? 'success' : 'warning'}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SystemHealthView;
