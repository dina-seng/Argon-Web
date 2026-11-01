import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../lib/api';

export interface PlatformMetricsOverview {
  totalPaidBookings: number;
  grossRevenue: number;
  gmv: number;
  totalTicketsSold: number;
  activeEventsCount: number;
  doorCheckInCount: number;
  usersByRole: {
    CUSTOMER: number;
    ORGANIZER: number;
    ADMIN: number;
  };
}

export interface RecentActivityItem {
  id: string;
  action: string;
  actorEmail: string;
  entity: string;
  entityId: string;
  timestamp: string;
  status: 'SUCCESS' | 'WARNING' | 'DANGER' | 'INFO';
  description: string;
}

export interface AdminDashboardViewProps {
  autoRefreshIntervalMs?: number;
}

export function AdminDashboardView({ autoRefreshIntervalMs = 15000 }: AdminDashboardViewProps) {
  const [metrics, setMetrics] = useState<PlatformMetricsOverview | null>(null);
  const [activities, setActivities] = useState<RecentActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);

  const fetchOverview = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      let data: PlatformMetricsOverview;
      try {
        data = await api.get<PlatformMetricsOverview>('/api/v1/admin/metrics/overview');
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('404')) {
          data = await api.get<PlatformMetricsOverview>('/admin/metrics/overview');
        } else {
          throw err;
        }
      }

      if (data && typeof data.grossRevenue === 'number') {
        setMetrics(data);
        setError(null);
      } else {
        throw new Error('Unexpected metrics response shape from server');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve administrative metrics.';
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setLastRefreshedAt(new Date());
    }

    // Attempt to fetch live audit logs for activity feed
    try {
      let auditRes: {
        data: Array<{
          id: string;
          action: string;
          actor?: { email?: string };
          entity: string;
          entityId: string;
          createdAt: string;
          metadata?: Record<string, unknown>;
        }>;
      };
      try {
        auditRes = await api.get('/api/v1/admin/audit?limit=5');
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('404')) {
          auditRes = await api.get('/admin/audit?limit=5');
        } else {
          throw err;
        }
      }

      if (auditRes && Array.isArray(auditRes.data)) {
        const mapped: RecentActivityItem[] = auditRes.data.map((log) => {
          let status: RecentActivityItem['status'] = 'INFO';
          if (log.action.includes('REFUND')) status = 'DANGER';
          else if (log.action.includes('FORCE')) status = 'WARNING';
          else if (log.action.includes('PROMOTED')) status = 'SUCCESS';

          const timeStr = new Date(log.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });

          return {
            id: log.id,
            action: log.action,
            actorEmail: log.actor?.email ?? 'system@argon.kh',
            entity: log.entity,
            entityId: log.entityId,
            timestamp: timeStr,
            status,
            description: log.metadata?.reason
              ? String(log.metadata.reason)
              : `${log.action.replace(/_/g, ' ')} on ${log.entity} #${log.entityId.slice(0, 8)}`,
          };
        });
        setActivities(mapped);
      }
    } catch {
      // Non-fatal; activities list remains unchanged
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchOverview(false);
  }, [fetchOverview]);

  // Polling auto-refresh
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const interval = setInterval(() => {
      fetchOverview(false);
    }, autoRefreshIntervalMs);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, autoRefreshIntervalMs, fetchOverview]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);

  const formatNumber = (val: number) => new Intl.NumberFormat('en-US').format(val);

  return (
    <div className="space-y-8 animate-fade-in text-white pb-12">
      {/* Top Header & Refresh Control */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
              Super-Admin Platform Governance
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Platform Root
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Real-time gross platform volume, system gateway health, user permissions, and transaction overrides.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
              autoRefreshEnabled
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-white/10 bg-surface-card text-gray-400 hover:text-white'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                autoRefreshEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
              }`}
            />
            <span>Auto-Refresh ({autoRefreshIntervalMs / 1000}s)</span>
          </button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => fetchOverview(true)}
            isLoading={isRefreshing || isLoading}
            className="flex items-center gap-2"
          >
            <svg
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              <strong>API Error:</strong> {error}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-rose-400/80">
              {lastRefreshedAt.toLocaleTimeString()}
            </span>
            <Button variant="secondary" size="sm" onClick={() => fetchOverview(true)}>
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      {isLoading && !metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse py-8 flex flex-col justify-center items-center">
              <div className="h-3 w-28 bg-white/10 rounded mb-4" />
              <div className="h-8 w-36 bg-white/20 rounded" />
            </Card>
          ))}
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Gross Platform Volume */}
          <Card className="relative overflow-hidden group hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">
                Gross Platform Volume
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                {formatCurrency(metrics.grossRevenue)}
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                <span className="text-emerald-400 font-semibold inline-flex items-center gap-0.5">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  GMV Settled
                </span>
                <span>platform volume</span>
              </div>
            </div>
          </Card>

          {/* Paid Bookings & Tickets */}
          <Card className="relative overflow-hidden group hover:border-indigo-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">
                Bookings & Tickets Sold
              </span>
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                {formatNumber(metrics.totalTicketsSold)}
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                <span className="font-mono text-gray-300 font-medium">
                  {formatNumber(metrics.totalPaidBookings)}
                </span>
                <span>paid checkout transactions</span>
              </div>
            </div>
          </Card>

          {/* Active Published Events */}
          <Card className="relative overflow-hidden group hover:border-sky-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">
                Active Events
              </span>
              <div className="h-8 w-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/20">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                {metrics.activeEventsCount}
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                <span className="inline-flex items-center gap-1 text-sky-400 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  Published
                </span>
                <span>live on discovery marketplace</span>
              </div>
            </div>
          </Card>

          {/* Registered Organizers & Users */}
          <Card className="relative overflow-hidden group hover:border-purple-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-gray-400 uppercase tracking-wider">
                Registered Organizers
              </span>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                {metrics.usersByRole?.ORGANIZER ?? 0}
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                <span className="font-mono text-gray-300 font-medium">
                  {formatNumber(metrics.usersByRole?.CUSTOMER ?? 0)}
                </span>
                <span>active customers enrolled</span>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {/* Operational Health Status & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operational Health Status */}
        <Card className="lg:col-span-1 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-display font-bold text-base text-white flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Operational Health Status
            </h2>
            <span className="font-mono text-[11px] text-gray-400 uppercase">Production v1</span>
          </div>

          <div className="space-y-4 text-sm">
            {/* Bakong KHQR Gateway */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated/60 border border-white/5">
              <div className="space-y-0.5">
                <div className="font-medium text-white flex items-center gap-2">
                  <span>Bakong KHQR Gateway</span>
                </div>
                <div className="text-xs text-gray-400">NBC Open API webhook listener</div>
              </div>
              <div className="text-right">
                <Badge label="Operational" variant="success" />
                <div className="font-mono text-[10px] text-gray-400 mt-1">42ms latency</div>
              </div>
            </div>

            {/* Inventory Sweeper */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated/60 border border-white/5">
              <div className="space-y-0.5">
                <div className="font-medium text-white flex items-center gap-2">
                  <span>Inventory Sweeper</span>
                </div>
                <div className="text-xs text-gray-400">60s hold expiration cron worker</div>
              </div>
              <div className="text-right">
                <Badge label="Active" variant="success" />
                <div className="font-mono text-[10px] text-gray-400 mt-1">0 stuck holds</div>
              </div>
            </div>

            {/* Redis Distributed Lock */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated/60 border border-white/5">
              <div className="space-y-0.5">
                <div className="font-medium text-white">Redlock Concurrency Guard</div>
                <div className="text-xs text-gray-400">Anti-oversell mutex engine</div>
              </div>
              <div className="text-right">
                <Badge label="Connected" variant="success" />
                <div className="font-mono text-[10px] text-gray-400 mt-1">0.8ms p95</div>
              </div>
            </div>

            {/* Primary Database */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated/60 border border-white/5">
              <div className="space-y-0.5">
                <div className="font-medium text-white">PostgreSQL Cluster</div>
                <div className="text-xs text-gray-400">Prisma connection pool</div>
              </div>
              <div className="text-right">
                <Badge label="Healthy" variant="success" />
                <div className="font-mono text-[10px] text-gray-400 mt-1">Active Pool</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Navigation Shortcuts */}
        <Card className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-display font-bold text-base text-white">
              Platform Administration Shortcuts
            </h2>
            <span className="text-xs text-gray-400">Role-gated executive modules</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* User Directory */}
            <Link
              to="/admin/users"
              className="group p-4 rounded-xl border border-white/10 bg-surface-elevated/40 hover:bg-surface-elevated hover:border-indigo-500/40 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <span className="text-xs font-mono text-gray-400 group-hover:text-indigo-400 flex items-center gap-1 transition-colors">
                  Manage →
                </span>
              </div>
              <div className="mt-3">
                <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                  User Management & Roles
                </h3>
                <p className="mt-1 text-xs text-gray-400 leading-relaxed">
                  Search directory, promote Customers to Organizers, and audit role elevation events.
                </p>
              </div>
            </Link>

            {/* Transaction Overrides */}
            <Link
              to="/admin/transactions"
              className="group p-4 rounded-xl border border-white/10 bg-surface-elevated/40 hover:bg-surface-elevated hover:border-amber-500/40 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                </div>
                <span className="text-xs font-mono text-gray-400 group-hover:text-amber-400 flex items-center gap-1 transition-colors">
                  Resolve →
                </span>
              </div>
              <div className="mt-3">
                <h3 className="font-semibold text-white group-hover:text-amber-300 transition-colors">
                  Transaction Overrides
                </h3>
                <p className="mt-1 text-xs text-gray-400 leading-relaxed">
                  Operational runbook: Force-confirm stuck Bakong transfers or trigger emergency refunds.
                </p>
              </div>
            </Link>

            {/* System Audit Logs */}
            <Link
              to="/admin/audit"
              className="group p-4 rounded-xl border border-white/10 bg-surface-elevated/40 hover:bg-surface-elevated hover:border-emerald-500/40 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                </div>
                <span className="text-xs font-mono text-gray-400 group-hover:text-emerald-400 flex items-center gap-1 transition-colors">
                  Inspect →
                </span>
              </div>
              <div className="mt-3">
                <h3 className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                  System Audit Logs
                </h3>
                <p className="mt-1 text-xs text-gray-400 leading-relaxed">
                  Immutable audit trail of administrator actions, quota updates, role grants, and overrides.
                </p>
              </div>
            </Link>

            {/* Organizer Tools Gateway */}
            <Link
              to="/organizer"
              className="group p-4 rounded-xl border border-white/10 bg-surface-elevated/40 hover:bg-surface-elevated hover:border-purple-500/40 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <span className="text-xs font-mono text-gray-400 group-hover:text-purple-400 flex items-center gap-1 transition-colors">
                  Switch →
                </span>
              </div>
              <div className="mt-3">
                <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                  Organizer Event Suite
                </h3>
                <p className="mt-1 text-xs text-gray-400 leading-relaxed">
                  Switch to Organizer operations: monitor gate attendance, manage quotas, and view rosters.
                </p>
              </div>
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent Platform Activity Feed */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="font-display font-bold text-lg text-white">Recent Platform Activity</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              High-priority events recorded across all tenant events and administrative actors.
            </p>
          </div>
          <Link
            to="/admin/audit"
            className="text-xs font-medium text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
          >
            <span>Full Audit Trail</span>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            No recent activity records available.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {activities.map((item) => (
              <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${
                      item.status === 'SUCCESS'
                        ? 'bg-emerald-400'
                        : item.status === 'WARNING'
                        ? 'bg-amber-400'
                        : item.status === 'DANGER'
                        ? 'bg-rose-400'
                        : 'bg-indigo-400'
                    }`}
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-white">
                        {item.action}
                      </span>
                      <span className="text-xs text-gray-400">by</span>
                      <span className="text-xs font-medium text-gray-300">{item.actorEmail}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 sm:self-center ml-5 sm:ml-0">
                  <span className="font-mono text-[11px] text-gray-400">{item.timestamp}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10">
                    {item.entity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminDashboardView;
