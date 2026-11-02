import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export interface PlatformMetricsOverview {
  grossRevenue: number;
  totalTicketsSold: number;
  activeEventsCount: number;
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
  }>;
  systemHealth?: {
    database: { status: string; latencyMs: number };
    redis: { status: string; latencyMs: number };
  };
}

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
  const [metrics, setMetrics] = useState<PlatformMetricsOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Time range filter for dual-layer timeline
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | 'ALL'>('7D');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const fetchOverview = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      let overview: PlatformMetricsOverview;
      try {
        overview = await api.get<PlatformMetricsOverview>('/api/v1/admin/metrics/overview');
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('404')) {
          overview = await api.get<PlatformMetricsOverview>('/admin/metrics/overview');
        } else {
          throw err;
        }
      }

      setMetrics(overview);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to query administrative metrics.';
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
      maximumFractionDigits: 0,
    }).format(val);

  const formatNumber = (val: number) =>
    new Intl.NumberFormat('en-US').format(val);

  // User demographic distribution computed dynamically
  const userCounts = metrics?.usersByRole ?? { CUSTOMER: 0, ORGANIZER: 0, ADMIN: 0 };
  const totalUsers = userCounts.CUSTOMER + userCounts.ORGANIZER + userCounts.ADMIN;
  const customerPct = totalUsers > 0 ? Math.round((userCounts.CUSTOMER / totalUsers) * 100) : 0;
  const organizerPct = totalUsers > 0 ? Math.round((userCounts.ORGANIZER / totalUsers) * 100) : 0;
  const adminPct = totalUsers > 0 ? Math.max(0, 100 - customerPct - organizerPct) : 0;

  // Timeline points filtered by selected time range
  const timelinePoints = useMemo(() => {
    const raw = metrics?.dailyVelocity ?? [];
    if (raw.length === 0) return [];
    if (timeRange === '7D') return raw.slice(-7);
    if (timeRange === '30D') return raw.slice(-30);
    return raw;
  }, [metrics?.dailyVelocity, timeRange]);

  const maxRevenue = useMemo(() => {
    const maxVal = Math.max(...timelinePoints.map((p) => p.revenue), 100);
    return maxVal;
  }, [timelinePoints]);

  const maxOrders = useMemo(() => {
    const maxVal = Math.max(...timelinePoints.map((p) => p.orders), 5);
    return maxVal;
  }, [timelinePoints]);

  // Compute SVG Area path coordinates for cumulative revenue curve
  const svgDimensions = { width: 800, height: 180 };
  const areaPoints = useMemo(() => {
    if (timelinePoints.length === 0) return '';
    const stepX = svgDimensions.width / Math.max(timelinePoints.length - 1, 1);
    const coords = timelinePoints.map((p, idx) => {
      const x = idx * stepX;
      const y = svgDimensions.height - (p.revenue / maxRevenue) * (svgDimensions.height - 20) - 10;
      return `${x},${y}`;
    });

    const firstX = 0;
    const lastX = (timelinePoints.length - 1) * stepX;
    return `M ${firstX},${svgDimensions.height} L ${coords.join(' L ')} L ${lastX},${svgDimensions.height} Z`;
  }, [timelinePoints, maxRevenue]);

  const linePoints = useMemo(() => {
    if (timelinePoints.length === 0) return '';
    const stepX = svgDimensions.width / Math.max(timelinePoints.length - 1, 1);
    const coords = timelinePoints.map((p, idx) => {
      const x = idx * stepX;
      const y = svgDimensions.height - (p.revenue / maxRevenue) * (svgDimensions.height - 20) - 10;
      return `${x},${y}`;
    });
    return `M ${coords.join(' L ')}`;
  }, [timelinePoints, maxRevenue]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100 pb-16">
      {/* ==================================================================== */}
      {/* 1. GREETING & HEADER ROW                                             */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-slate-900 dark:text-white">
              Platform Overview
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Ground-truth settlement data, active attendee accounts, and real-time node telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchOverview(true)}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:border-[#FF5B22] transition-colors disabled:opacity-50"
          >
            <svg
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-[#FF5B22]' : 'text-slate-500 dark:text-slate-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-4 text-xs text-rose-700 dark:text-rose-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchOverview(true)} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. FOUR HERO METRIC BENTO CARDS                                      */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Gross Revenue */}
        <div className="group relative rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Gross Settlement</span>
            <Link
              to="/admin/bookings"
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-800 text-white shadow-sm transition hover:bg-[#FF5B22]"
              title="Inspect bookings"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </Link>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isLoading && !metrics ? '—' : formatCurrency(metrics?.grossRevenue ?? 0)}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
            <span>Settled Bookings</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
              {metrics?.totalTicketsSold ? `${metrics.totalTicketsSold} tickets` : '0 tickets'}
            </span>
          </div>
        </div>

        {/* Card 2: Published Events */}
        <div className="group relative rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Events</span>
            <Link
              to="/admin/events"
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-800 text-white shadow-sm transition hover:bg-[#FF5B22]"
              title="Inspect catalog"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </Link>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isLoading && !metrics ? '—' : formatNumber(metrics?.activeEventsCount ?? 0)}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
            <span>Marketplace status</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">Open for sales</span>
          </div>
        </div>

        {/* Card 3: Issued Tickets */}
        <div className="group relative rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tickets Issued</span>
            <Link
              to="/admin/bookings"
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-800 text-white shadow-sm transition hover:bg-[#FF5B22]"
              title="Inspect tickets"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </Link>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isLoading && !metrics ? '—' : formatNumber(metrics?.totalTicketsSold ?? 0)}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
            <span>Door check-ins</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{metrics?.doorCheckInCount ?? 0} admitted</span>
          </div>
        </div>

        {/* Card 4: Accounts */}
        <div className="group relative rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Platform Accounts</span>
            <Link
              to="/admin/users"
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 dark:bg-slate-800 text-white shadow-sm transition hover:bg-[#FF5B22]"
              title="Inspect users"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
              </svg>
            </Link>
          </div>

          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
              {isLoading && !metrics ? '—' : formatNumber(totalUsers)}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
            <span>Role distribution</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
              {userCounts.CUSTOMER}C · {userCounts.ORGANIZER}O · {userCounts.ADMIN}A
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. RICH DUAL-LAYER GRAPH: REVENUE CURVE + DAILY VOLUME BARS           */}
      {/* ==================================================================== */}
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] p-6 sm:p-7 shadow-sm transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 font-mono">
              Financial Progression & Transaction Volume
            </div>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white tracking-tight">
                {isLoading && !metrics ? '—' : formatCurrency(metrics?.grossRevenue ?? 0)}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cumulative Real Earnings</span>
            </div>
          </div>

          {/* Time range filter buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
            {(['7D', '30D', 'ALL'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  timeRange === range
                    ? 'bg-[#FF5B22] text-white shadow-sm font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {range === '7D' ? '7 Days' : range === '30D' ? '30 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        {/* Dual Layer Chart Visualization */}
        <div className="relative pt-6 pb-2">
          {timelinePoints.length === 0 ? (
            <div className="py-14 text-center text-xs text-slate-400 font-mono">
              No financial transaction records found for this time range.
            </div>
          ) : (
            <div className="relative h-60">
              {/* SVG Area Layer */}
              <svg
                viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-44 overflow-visible pointer-events-none opacity-40 dark:opacity-30"
              >
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF5B22" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#FF5B22" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={areaPoints} fill="url(#revenueGradient)" />
                <path d={linePoints} fill="none" stroke="#FF5B22" strokeWidth="2.5" />
              </svg>

              {/* Bar Columns Layer */}
              <div className="relative z-10 flex items-end justify-between gap-2 h-44 px-3 sm:px-6">
                {timelinePoints.map((day, idx) => {
                  const isHovered = hoveredIndex === idx;
                  const barHeight = day.orders > 0
                    ? Math.max(20, Math.round((day.orders / maxOrders) * 120))
                    : 10;

                  const dateLabel = new Date(day.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'numeric',
                    day: 'numeric',
                  });

                  return (
                    <div
                      key={day.date}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
                    >
                      {/* Interactive Tooltip Card */}
                      {isHovered && (
                        <div className="absolute -top-16 z-30 flex flex-col items-center animate-fade-in pointer-events-none">
                          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-900 text-white p-2.5 text-[11px] whitespace-nowrap shadow-xl space-y-0.5">
                            <div className="font-mono text-slate-300 font-bold">{day.date}</div>
                            <div>Revenue: <strong className="text-[#FF5B22] font-mono">{formatCurrency(day.revenue)}</strong></div>
                            <div>Orders: <strong className="text-white font-mono">{day.orders}</strong></div>
                          </div>
                          <div className="h-2 w-2 rotate-45 bg-slate-900 -mt-1" />
                        </div>
                      )}

                      {/* Bar Column */}
                      <div
                        className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 ${
                          day.revenue > 0
                            ? isHovered
                              ? 'bg-[#FF5B22] shadow-md shadow-orange-500/30'
                              : 'bg-[#FF5B22]/85'
                            : isHovered
                            ? 'bg-slate-300 dark:bg-slate-700'
                            : 'bg-slate-200/80 dark:bg-slate-800'
                        }`}
                        style={{ height: `${barHeight}px` }}
                      />

                      {/* Date label */}
                      <span
                        className={`mt-2 text-[10px] font-semibold whitespace-nowrap transition-colors ${
                          isHovered
                            ? 'text-[#FF5B22] font-bold'
                            : 'text-slate-400 dark:text-slate-400'
                        }`}
                      >
                        {dateLabel}
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
      {/* 4. REAL BOTTOM BENTO: DEMOGRAPHICS & EVENT CAPACITY                  */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: User Demographics Donut */}
        <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] p-6 sm:p-7 shadow-sm flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="font-display font-extrabold text-base text-slate-900 dark:text-white">
                Platform Account Demographics
              </h2>
              <span className="text-xs font-mono text-slate-400">PostgreSQL Auth</span>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-around gap-6">
              {/* Donut graphic */}
              <div className="relative h-40 w-40 shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
                  <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                  {/* Customer segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#FF5B22"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={`${customerPct * 2.38} 238`}
                    strokeDashoffset="0"
                    className="transition-all duration-700 ease-out"
                  />
                  {/* Organizer segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#38BDF8"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={`${organizerPct * 2.38} 238`}
                    strokeDashoffset={`-${customerPct * 2.38}`}
                    className="transition-all duration-700 ease-out"
                  />
                  {/* Admin segment */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    stroke="#818CF8"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={`${adminPct * 2.38} 238`}
                    strokeDashoffset={`-${(customerPct + organizerPct) * 2.38}`}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-display text-2xl font-black text-slate-900 dark:text-white">
                    {totalUsers}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Accounts
                  </span>
                </div>
              </div>

              {/* Real Legend */}
              <div className="space-y-3 text-xs font-medium w-full sm:w-auto">
                <div className="flex items-center justify-between sm:justify-start gap-6">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-[#FF5B22]" />
                    <span>Customers</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {userCounts.CUSTOMER} ({customerPct}%)
                  </span>
                </div>
                <div className="flex items-center justify-between sm:justify-start gap-6">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-[#38BDF8]" />
                    <span>Organizers</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {userCounts.ORGANIZER} ({organizerPct}%)
                  </span>
                </div>
                <div className="flex items-center justify-between sm:justify-start gap-6">
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-[#818CF8]" />
                    <span>Administrators</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {userCounts.ADMIN} ({adminPct}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Manage account permissions</span>
            <Link to="/admin/users" className="font-bold text-[#FF5B22] hover:underline">
              User Directory →
            </Link>
          </div>
        </div>

        {/* Right: Real Active Events & System Diagnostics */}
        <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] p-6 sm:p-7 shadow-sm flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h2 className="font-display font-extrabold text-base text-slate-900 dark:text-white">
                  Event Capacity & Telemetry
                </h2>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                    {metrics?.activeEventsCount ?? 0} Published Events
                  </span>
                </div>
              </div>
              <Link
                to="/admin/system"
                className="text-xs font-bold text-[#FF5B22] hover:underline"
              >
                Deep Health Hub →
              </Link>
            </div>

            {/* Event List & Capacity */}
            <div className="mt-5 space-y-3.5">
              {(!metrics?.topEvents || metrics.topEvents.length === 0) ? (
                <div className="py-6 text-center text-xs text-slate-400 font-mono">
                  No active published events found in catalog.
                </div>
              ) : (
                metrics.topEvents.map((evt) => {
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
                      {/* Capacity progress bar */}
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
            <span className="text-slate-400">View live node infrastructure</span>
            <Link to="/admin/system" className="font-bold text-[#FF5B22] hover:underline">
              System Health & Diagnostics →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardView;
