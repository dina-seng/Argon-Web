import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../lib/api';

export interface AdminOverviewMetrics {
  grossRevenue: number;
  activeEventsCount: number;
  totalTicketsSold: number;
  doorCheckInCount: number;
  usersByRole: {
    CUSTOMER: number;
    ORGANIZER: number;
    ADMIN: number;
  };
  dailyVelocity: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
  topEvents?: Array<{
    id: string;
    title: string;
    totalSold: number;
    totalCapacity: number;
    grossRevenue?: number;
  }>;
  systemHealth?: {
    database: { latencyMs: number };
    redis: { latencyMs: number };
  };
}

export type PlatformMetricsOverview = AdminOverviewMetrics;

export interface RecentActivityItem {
  id: string;
  action: string;
  entity: string;
  actor: {
    name: string | null;
    email: string;
    role: string;
  } | null;
  createdAt: string;
}

export interface AdminDashboardViewProps {
  onNavigateTab?: (tab: string) => void;
}

export function AdminDashboardView({ onNavigateTab: _onNavigateTab }: AdminDashboardViewProps) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<AdminOverviewMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | 'ALL'>('7D');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const fetchOverview = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      let res: AdminOverviewMetrics;
      try {
        res = await api.get<AdminOverviewMetrics>('/api/v1/admin/metrics/overview');
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('404')) {
          res = await api.get<AdminOverviewMetrics>('/admin/metrics/overview');
        } else {
          throw err;
        }
      }
      setMetrics(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to query platform operational metrics.';
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);

  const formatNumber = (val: number) =>
    new Intl.NumberFormat('en-US').format(val);

  // User demographic distribution strictly computed from real database data
  const userCounts = metrics?.usersByRole ?? { CUSTOMER: 0, ORGANIZER: 0, ADMIN: 0 };
  const totalUsers = userCounts.CUSTOMER + userCounts.ORGANIZER + userCounts.ADMIN;
  const customerPct = totalUsers > 0 ? Math.round((userCounts.CUSTOMER / totalUsers) * 100) : 0;
  const organizerPct = totalUsers > 0 ? Math.round((userCounts.ORGANIZER / totalUsers) * 100) : 0;
  const adminPct = totalUsers > 0 ? Math.max(0, 100 - customerPct - organizerPct) : 0;

  // Real daily velocity points filtered by selected time range
  const timelinePoints = useMemo(() => {
    const raw = metrics?.dailyVelocity ?? [];
    if (raw.length === 0) return [];
    if (timeRange === '7D') return raw.slice(-7);
    if (timeRange === '30D') return raw.slice(-30);
    return raw;
  }, [metrics?.dailyVelocity, timeRange]);

  const maxRevenue = useMemo(() => {
    if (timelinePoints.length === 0) return 100;
    const maxVal = Math.max(...timelinePoints.map((p) => p.revenue), 100);
    return maxVal;
  }, [timelinePoints]);

  const todayDateStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }, []);

  const adminName = user?.email?.split('@')[0] || 'Administrator';

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100 pb-16">
      {/* ==================================================================== */}
      {/* 1. GREETING & FILTER BAR                                             */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {adminName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Overview of platform activity, ticket sales, and events.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Timeframe Selector Pill */}
          <div className="flex items-center gap-1 p-1 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] shadow-sm">
            {(['7D', '30D', 'ALL'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                  timeRange === range
                    ? 'bg-[#FF5B22] text-white shadow-sm font-bold scale-105'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {range === '7D' ? '7 Days' : range === '30D' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>

          {/* Date Indicator Pill */}
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm">
            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{todayDateStr}</span>
          </div>

          {/* Refresh Action Button */}
          <button
            type="button"
            onClick={() => fetchOverview(true)}
            disabled={isRefreshing || isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] text-slate-600 dark:text-slate-300 shadow-sm hover:border-[#FF5B22] hover:text-[#FF5B22] transition-transform active:scale-95 disabled:opacity-50"
            title="Refresh metrics"
          >
            <svg
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-[#FF5B22]' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-4 text-xs text-rose-700 dark:text-rose-400 flex items-center justify-between animate-fade-in">
          <span>{error}</span>
          <button onClick={() => fetchOverview(true)} className="font-bold underline hover:opacity-80">
            Retry
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. FOUR HERO METRIC CARDS (Clean, Contextual, Zero Meaningless Graphs) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Gross Revenue */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Gross Revenue
              </span>
              <Link
                to="/admin/bookings"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B0F17] dark:bg-slate-800 text-white shadow-sm transition-colors group-hover:bg-[#FF5B22]"
                title="View bookings"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </Link>
            </div>

            <div className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tight">
              {isLoading && !metrics ? '—' : formatCurrency(metrics?.grossRevenue ?? 0)}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Settlement Status</span>
            <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>{metrics?.grossRevenue ? 'Reconciled' : 'Awaiting checkouts'}</span>
            </span>
          </div>
        </div>

        {/* Card 2: Active Events */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Active Events
              </span>
              <Link
                to="/admin/events"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B0F17] dark:bg-slate-800 text-white shadow-sm transition-colors group-hover:bg-[#FF5B22]"
                title="View event catalog"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </Link>
            </div>

            <div className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tight">
              {isLoading && !metrics ? '—' : formatNumber(metrics?.activeEventsCount ?? 0)}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Catalog State</span>
            <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{metrics?.activeEventsCount ? 'Live on Marketplace' : 'No active events'}</span>
            </span>
          </div>
        </div>

        {/* Card 3: Tickets Issued */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Tickets Issued
              </span>
              <Link
                to="/admin/bookings"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B0F17] dark:bg-slate-800 text-white shadow-sm transition-colors group-hover:bg-[#FF5B22]"
                title="View tickets"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </Link>
            </div>

            <div className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tight">
              {isLoading && !metrics ? '—' : formatNumber(metrics?.totalTicketsSold ?? 0)}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Door Check-ins</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {metrics?.doorCheckInCount ?? 0} / {metrics?.totalTicketsSold ?? 0}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#FF5B22] transition-all duration-500"
                style={{
                  width: metrics?.totalTicketsSold
                    ? `${Math.min(100, Math.round(((metrics.doorCheckInCount || 0) / metrics.totalTicketsSold) * 100))}%`
                    : '0%',
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Platform Accounts */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Platform Accounts
              </span>
              <Link
                to="/admin/users"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B0F17] dark:bg-slate-800 text-white shadow-sm transition-colors group-hover:bg-[#FF5B22]"
                title="View user directory"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </Link>
            </div>

            <div className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-display font-black text-slate-900 dark:text-white tracking-tight">
              {isLoading && !metrics ? '—' : formatNumber(totalUsers)}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>{userCounts.CUSTOMER} Customers</span>
              <span>{userCounts.ORGANIZER} Organizers</span>
              <span>{userCounts.ADMIN} Admins</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex gap-0.5">
              <div
                className="h-full bg-[#FF5B22] rounded-l-full transition-all duration-500"
                style={{ width: `${customerPct}%` }}
                title="Customers"
              />
              <div
                className="h-full bg-[#06B6D4] transition-all duration-500"
                style={{ width: `${organizerPct}%` }}
                title="Organizers"
              />
              <div
                className="h-full bg-[#818CF8] rounded-r-full transition-all duration-500"
                style={{ width: `${adminPct}%` }}
                title="Admins"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. HERO CHART: REVENUE & ORDER VELOCITY (Zero Fake Data)             */}
      {/* ==================================================================== */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] p-6 sm:p-7 shadow-sm transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Revenue & Order Activity
            </h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Total Revenue: <strong className="text-slate-900 dark:text-white font-bold">{formatCurrency(metrics?.grossRevenue ?? 0)}</strong>
              </span>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-[#FF5B22]" />
                  <span>Revenue</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  <span>Orders</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Real Data Histogram or Honest Initial State */}
        <div className="relative pt-6 pb-2">
          {timelinePoints.length === 0 ? (
            /* True initial state when no transaction records exist */
            <div className="py-16 text-center">
              <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Transaction Activity Recorded Yet
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Daily order volume and settlement charts will populate in real time as attendees purchase tickets.
              </p>
            </div>
          ) : (
            /* Real Daily Velocity Columns */
            <div className="relative h-64 w-full">
              {/* Y-Axis Grid Lines */}
              <div className="relative h-60 w-full flex flex-col justify-between pointer-events-none text-[11px] font-mono text-slate-400">
                {[formatCurrency(maxRevenue), formatCurrency(maxRevenue * 0.5), '$0.00'].map((label) => (
                  <div key={label} className="relative flex items-center w-full">
                    <span className="w-16 shrink-0">{label}</span>
                    <div className="w-full border-b border-slate-100 dark:border-slate-800/80 ml-2" />
                  </div>
                ))}
              </div>

              {/* Bar Columns Container */}
              <div className="absolute inset-0 pl-16 pr-2 pt-2 pb-6 flex items-end justify-between gap-2 sm:gap-4">
                {timelinePoints.map((day, idx) => {
                  const isHovered = hoveredBarIndex === idx;
                  const revHeight = maxRevenue > 0
                    ? Math.max(8, Math.round((day.revenue / maxRevenue) * 160))
                    : 8;

                  return (
                    <div
                      key={day.date}
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                      className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group"
                    >
                      {/* Vertical Guideline on Hover */}
                      {isHovered && (
                        <div className="absolute inset-y-0 w-px border-l border-dashed border-slate-400 dark:border-slate-600 z-10 pointer-events-none" />
                      )}

                      {/* Tooltip Card */}
                      {isHovered && (
                        <div className="absolute -top-16 z-30 flex flex-col items-center animate-fade-in pointer-events-none">
                          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs whitespace-nowrap shadow-xl space-y-1">
                            <div className="font-bold text-slate-800 dark:text-slate-100">{day.date}</div>
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <span className="h-2 w-2 rounded-full bg-[#FF5B22]" />
                              <span>Revenue: <strong className="text-slate-900 dark:text-white font-mono">{formatCurrency(day.revenue)}</strong></span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <span className="h-2 w-2 rounded-full bg-slate-400" />
                              <span>Orders: <strong className="text-slate-900 dark:text-white font-mono">{day.orders}</strong></span>
                            </div>
                          </div>
                          <div className="h-2 w-2 rotate-45 bg-white dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-700 -mt-1" />
                        </div>
                      )}

                      {/* Real Segmented Bar */}
                      <div className="w-full max-w-[28px] flex flex-col gap-1 items-center justify-end z-20">
                        <div
                          className={`w-full rounded-md transition-all duration-300 ${
                            day.revenue > 0
                              ? isHovered
                                ? 'bg-[#FF5B22] shadow-sm shadow-[#FF5B22]/50 scale-105'
                                : 'bg-[#FF5B22]'
                              : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                          style={{ height: `${revHeight}px` }}
                        />
                      </div>

                      {/* Date label */}
                      <span
                        className={`mt-2 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                          isHovered
                            ? 'text-[#FF5B22] font-bold'
                            : 'text-slate-400 dark:text-slate-400'
                        }`}
                      >
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. REAL BOTTOM BENTO (Demographics & Event Capacity)                 */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Real User Demographics */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] p-6 sm:p-7 shadow-sm flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Platform Users
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Account breakdown across PostgreSQL authentication roles
                </div>
              </div>
              <Link to="/admin/users" className="text-xs font-bold text-[#FF5B22] hover:underline">
                View All →
              </Link>
            </div>

            {/* Donut and Role List */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Donut graphic */}
              <div className="relative h-44 w-44 shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
                  <circle cx="50" cy="50" r="36" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                  {/* Customers */}
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    stroke="#FF5B22"
                    strokeWidth="16"
                    fill="transparent"
                    strokeDasharray={`${customerPct * 2.26} 226`}
                    strokeDashoffset="0"
                    className="transition-all duration-700 ease-out"
                  />
                  {/* Organizers */}
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    stroke="#06B6D4"
                    strokeWidth="16"
                    fill="transparent"
                    strokeDasharray={`${organizerPct * 2.26} 226`}
                    strokeDashoffset={`-${customerPct * 2.26}`}
                    className="transition-all duration-700 ease-out"
                  />
                  {/* Admins */}
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    stroke="#818CF8"
                    strokeWidth="16"
                    fill="transparent"
                    strokeDasharray={`${adminPct * 2.26} 226`}
                    strokeDashoffset={`-${(customerPct + organizerPct) * 2.26}`}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-display text-xl font-extrabold text-slate-900 dark:text-white">
                    {totalUsers}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Accounts
                  </span>
                </div>
              </div>

              {/* Roles Breakdown */}
              <div className="space-y-3 text-xs font-medium w-full sm:w-56">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#FF5B22]" />
                    <span>Customers</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {userCounts.CUSTOMER} ({customerPct}%)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#06B6D4]" />
                    <span>Organizers</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {userCounts.ORGANIZER} ({organizerPct}%)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#818CF8]" />
                    <span>Administrators</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {userCounts.ADMIN} ({adminPct}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Real Active Events & System Health */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] p-6 sm:p-7 shadow-sm flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Event Capacity & Telemetry
                </h3>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real event ticket capacity and system latency
                </div>
              </div>
              <Link to="/admin/events" className="text-xs font-bold text-[#FF5B22] hover:underline">
                Catalog →
              </Link>
            </div>

            {/* Event List or Empty State */}
            <div className="mt-5 space-y-3.5">
              {(!metrics?.topEvents || metrics.topEvents.length === 0) ? (
                <div className="py-6 text-center text-xs text-slate-400 font-mono">
                  No published events currently found in catalog.
                </div>
              ) : (
                metrics.topEvents.slice(0, 3).map((evt) => {
                  const utilization = evt.totalCapacity > 0
                    ? Math.round((evt.totalSold / evt.totalCapacity) * 100)
                    : 0;

                  return (
                    <div key={evt.id} className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/40">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                          {evt.title}
                        </span>
                        <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                          {evt.totalSold} / {evt.totalCapacity} sold ({utilization}%)
                        </span>
                      </div>
                      <div className="mt-2 w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#FF5B22] transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(3, utilization))}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* System Health Quick Telemetry */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  PostgreSQL
                </div>
                <div className="flex items-center gap-1.5 mt-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>{metrics?.systemHealth?.database?.latencyMs ?? 0}ms latency</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Redis Engine
                </div>
                <div className="flex items-center gap-1.5 mt-1 font-mono font-bold text-slate-800 dark:text-slate-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>{metrics?.systemHealth?.redis?.latencyMs ?? 0}ms latency</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Node health diagnostics</span>
            <Link to="/admin/system" className="font-bold text-[#FF5B22] hover:underline">
              System Health Hub →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardView;
