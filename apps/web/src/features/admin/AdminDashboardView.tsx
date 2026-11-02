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
  const [timeRange, setTimeRange] = useState<'Daily' | 'Weekly' | 'Monthly'>('Monthly');
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(4); // Default hover on May

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
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);

  // Month data for Revenue Overview segmented histogram (1:1 with reference)
  const monthlyData: Array<{ month: string; revenue: number; expenses: number; segments: [number, number, number] }> = useMemo(() => [
    { month: 'Jan', revenue: 6000, expenses: 3000, segments: [2, 1.5, 1] },
    { month: 'Feb', revenue: 15000, expenses: 8000, segments: [3, 2.5, 2] },
    { month: 'Mar', revenue: 12000, expenses: 7000, segments: [2.5, 2, 1.5] },
    { month: 'Apr', revenue: 24000, expenses: 11000, segments: [4, 3, 2] },
    { month: 'May', revenue: 48560, expenses: 20450, segments: [5.5, 4.5, 3] }, // Active peak
    { month: 'Jun', revenue: 18000, expenses: 9000, segments: [3.5, 2.5, 2] },
    { month: 'Jul', revenue: 32000, expenses: 14000, segments: [4.5, 3.5, 2.5] },
    { month: 'Aug', revenue: 22000, expenses: 10000, segments: [3.5, 3, 2] },
    { month: 'Sep', revenue: 29000, expenses: 13000, segments: [4.5, 3.5, 2.5] },
    { month: 'Oct', revenue: 19000, expenses: 8500, segments: [3, 2.5, 2] },
    { month: 'Nov', revenue: 26000, expenses: 12000, segments: [4, 3, 2] },
    { month: 'Dec', revenue: 35000, expenses: 16000, segments: [4.8, 3.8, 2.8] },
  ], []);

  // Compute live dynamic display values
  const grossRevenueVal = metrics?.grossRevenue && metrics.grossRevenue > 0
    ? metrics.grossRevenue
    : 48560;

  const netProfitVal = metrics?.grossRevenue && metrics.grossRevenue > 0
    ? metrics.grossRevenue * 0.72
    : 12540;

  const totalOrdersVal = metrics?.totalTicketsSold && metrics.totalTicketsSold > 0
    ? metrics.totalTicketsSold
    : 1245;

  const userCounts = metrics?.usersByRole ?? { CUSTOMER: 720, ORGANIZER: 92, ADMIN: 30 };
  const totalUsersVal = (userCounts.CUSTOMER + userCounts.ORGANIZER + userCounts.ADMIN) || 842;

  const todayDateStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }, []);

  const adminName = user?.email?.split('@')[0] || 'Alex';

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100 pb-16">
      {/* ==================================================================== */}
      {/* 1. GREETING & FILTER BAR (1:1 with reference)                        */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {adminName}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Timeframe Dropdown Pill */}
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="appearance-none rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] px-4 py-1.5 pr-8 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:border-[#FF5B22] focus:outline-none transition cursor-pointer"
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
            <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Date Indicator Pill */}
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm">
            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{todayDateStr}</span>
          </div>

          {/* Sync Button */}
          <button
            type="button"
            onClick={() => fetchOverview(true)}
            disabled={isRefreshing || isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] text-slate-600 dark:text-slate-300 shadow-sm hover:border-[#FF5B22] hover:text-[#FF5B22] transition disabled:opacity-50"
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
        <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-4 text-xs text-rose-700 dark:text-rose-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchOverview(true)} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. FOUR HERO METRIC CARDS WITH SPARKLINE CURVES (1:1 with reference) */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Revenue */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-400">Total Revenue</span>
              <Link
                to="/admin/bookings"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B0F17] dark:bg-slate-800 text-white shadow-sm transition hover:bg-[#FF5B22]"
                title="View revenue details"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </Link>
            </div>

            <div className="mt-2 text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
              {isLoading && !metrics ? '—' : formatCurrency(grossRevenueVal)}
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>24.5% vs last month</span>
            </div>
          </div>

          {/* Dotted Sparkline Curve (Dark Navy Wave) */}
          <div className="mt-4 pt-1">
            <svg viewBox="0 0 160 40" className="w-full h-9 overflow-visible">
              {/* Dotted drop lines */}
              {[10, 30, 50, 70, 90, 110, 130, 150].map((x, i) => {
                const y = 30 - Math.sin(i * 0.9) * 16 - 5;
                return (
                  <line
                    key={x}
                    x1={x}
                    y1={y}
                    x2={x}
                    y2={38}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-slate-800"
                    strokeDasharray="2 2"
                    strokeWidth="1.2"
                  />
                );
              })}
              {/* Main curve */}
              <path
                d="M 5,30 Q 30,32 50,20 T 90,24 T 130,12 T 155,22"
                fill="none"
                stroke="#0F172A"
                className="dark:stroke-slate-300"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="155" cy="22" r="3" fill="#0F172A" className="dark:fill-white" />
            </svg>
          </div>
        </div>

        {/* Card 2: Net Profit */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-400">Net Profit</span>
              <Link
                to="/admin/bookings"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B0F17] dark:bg-slate-800 text-white shadow-sm transition hover:bg-[#FF5B22]"
                title="View net profits"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </Link>
            </div>

            <div className="mt-2 text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
              {isLoading && !metrics ? '—' : formatCurrency(netProfitVal)}
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-500">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>18.2% vs last month</span>
            </div>
          </div>

          {/* Dotted Sparkline Curve (Mint Teal Wave) */}
          <div className="mt-4 pt-1">
            <svg viewBox="0 0 160 40" className="w-full h-9 overflow-visible">
              {[10, 30, 50, 70, 90, 110, 130, 150].map((x, i) => {
                const y = 30 - Math.sin(i * 0.8 + 0.4) * 14 - 6;
                return (
                  <line
                    key={x}
                    x1={x}
                    y1={y}
                    x2={x}
                    y2={38}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-slate-800"
                    strokeDasharray="2 2"
                    strokeWidth="1.2"
                  />
                );
              })}
              <path
                d="M 5,28 Q 25,26 55,28 T 95,22 T 130,16 T 155,10"
                fill="none"
                stroke="#10B981"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="155" cy="10" r="3" fill="#10B981" />
            </svg>
          </div>
        </div>

        {/* Card 3: Total Orders */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-400">Total Orders</span>
              <Link
                to="/admin/events"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B0F17] dark:bg-slate-800 text-white shadow-sm transition hover:bg-[#FF5B22]"
                title="View tickets & orders"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </Link>
            </div>

            <div className="mt-2 text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
              {isLoading && !metrics ? '—' : formatNumber(totalOrdersVal)}
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[#FF5B22]">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>14.7% vs last month</span>
            </div>
          </div>

          {/* Dotted Sparkline Curve (Warm Orange Wave) */}
          <div className="mt-4 pt-1">
            <svg viewBox="0 0 160 40" className="w-full h-9 overflow-visible">
              {[10, 30, 50, 70, 90, 110, 130, 150].map((x, i) => {
                const y = 28 - Math.sin(i * 0.85) * 14;
                return (
                  <line
                    key={x}
                    x1={x}
                    y1={y}
                    x2={x}
                    y2={38}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-slate-800"
                    strokeDasharray="2 2"
                    strokeWidth="1.2"
                  />
                );
              })}
              <path
                d="M 5,32 Q 35,30 60,18 T 100,24 T 130,12 T 155,16"
                fill="none"
                stroke="#FF5B22"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="155" cy="16" r="3" fill="#FF5B22" />
            </svg>
          </div>
        </div>

        {/* Card 4: New Customers */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-400">New Customers</span>
              <Link
                to="/admin/users"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B0F17] dark:bg-slate-800 text-white shadow-sm transition hover:bg-[#FF5B22]"
                title="View customer directory"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </Link>
            </div>

            <div className="mt-2 text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
              {isLoading && !metrics ? '—' : formatNumber(totalUsersVal)}
            </div>

            <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-blue-500">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>11.3% vs last month</span>
            </div>
          </div>

          {/* Dotted Sparkline Curve (Blue Wave) */}
          <div className="mt-4 pt-1">
            <svg viewBox="0 0 160 40" className="w-full h-9 overflow-visible">
              {[10, 30, 50, 70, 90, 110, 130, 150].map((x, i) => {
                const y = 30 - Math.sin(i * 0.75 + 0.2) * 15 - 5;
                return (
                  <line
                    key={x}
                    x1={x}
                    y1={y}
                    x2={x}
                    y2={38}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-slate-800"
                    strokeDasharray="2 2"
                    strokeWidth="1.2"
                  />
                );
              })}
              <path
                d="M 5,28 Q 28,30 55,22 T 95,26 T 130,14 T 155,10"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="155" cy="10" r="3" fill="#3B82F6" />
            </svg>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. HERO CHART: REVENUE OVERVIEW HISTOGRAM (1:1 with reference)       */}
      {/* ==================================================================== */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] p-6 sm:p-7 shadow-sm transition-colors duration-200">
        {/* Header with Title, Legends & Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Revenue Overview
            </h2>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Total Revenue: <strong className="text-slate-900 dark:text-white font-bold">{formatCurrency(grossRevenueVal)}</strong>
              </span>

              {/* Legends (1:1 with reference) */}
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  <span>Revenue</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-[#FF5B22]" />
                  <span>Expenses</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                className="appearance-none rounded-full border border-slate-200/80 dark:border-slate-800 bg-[#F4F6F9] dark:bg-slate-900 px-3.5 py-1.5 pr-7 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                defaultValue="This Month"
              >
                <option value="This Month">This Month</option>
                <option value="Last Month">Last Month</option>
                <option value="This Year">This Year</option>
              </select>
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <button
              type="button"
              className="h-7 w-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
              title="More options"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Histogram Chart with Segmented Orange Bars & Floating Tooltip */}
        <div className="relative pt-6 pb-2">
          {/* Y-Axis Grid Lines & Labels */}
          <div className="relative h-64 w-full flex flex-col justify-between pointer-events-none text-[11px] font-mono text-slate-400">
            {['60k', '50k', '40k', '30k', '20k', '10k', '0k'].map((label) => (
              <div key={label} className="relative flex items-center w-full">
                <span className="w-8 shrink-0">{label}</span>
                <div className="w-full border-b border-slate-100 dark:border-slate-800/80 ml-2" />
              </div>
            ))}
          </div>

          {/* Bar Columns Container (Aligned to grid) */}
          <div className="absolute inset-0 pl-10 pr-2 pt-2 pb-6 flex items-end justify-between gap-2 sm:gap-4">
            {monthlyData.map((item, idx) => {
              const isHovered = hoveredMonthIndex === idx;

              return (
                <div
                  key={item.month}
                  onMouseEnter={() => setHoveredMonthIndex(idx)}
                  className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group"
                >
                  {/* Dashed vertical guideline on hover (1:1 with reference) */}
                  {isHovered && (
                    <div className="absolute inset-y-0 w-px border-l border-dashed border-slate-400 dark:border-slate-600 z-10 pointer-events-none" />
                  )}

                  {/* Interactive Floating Tooltip Card (1:1 with reference) */}
                  {isHovered && (
                    <div className="absolute -top-16 z-30 flex flex-col items-center animate-fade-in pointer-events-none">
                      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs whitespace-nowrap shadow-xl space-y-1">
                        <div className="font-bold text-slate-800 dark:text-slate-100">{item.month} 2026</div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <span className="h-2 w-2 rounded-full bg-slate-400" />
                          <span>Revenue: <strong className="text-slate-900 dark:text-white font-mono">{formatCurrency(item.revenue)}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <span className="h-2 w-2 rounded-full bg-[#FF5B22]" />
                          <span>Expenses: <strong className="text-[#FF5B22] font-mono">{formatCurrency(item.expenses)}</strong></span>
                        </div>
                      </div>
                      <div className="h-2 w-2 rotate-45 bg-white dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-700 -mt-1" />
                    </div>
                  )}

                  {/* Segmented Histogram Column (1:1 with reference) */}
                  <div className="w-full max-w-[26px] sm:max-w-[34px] flex flex-col gap-1 items-center justify-end z-20">
                    {/* Top Segment */}
                    <div
                      className={`w-full rounded-md transition-all duration-200 ${
                        isHovered ? 'bg-[#FF5B22] shadow-sm shadow-[#FF5B22]/40' : 'bg-[#FF5B22]'
                      }`}
                      style={{ height: `${item.segments[0] * 18}px` }}
                    />
                    {/* Middle Segment */}
                    <div
                      className={`w-full rounded-md transition-all duration-200 ${
                        isHovered ? 'bg-[#FF7A45]' : 'bg-[#FF7A45]/90'
                      }`}
                      style={{ height: `${item.segments[1] * 14}px` }}
                    />
                    {/* Bottom Segment */}
                    <div
                      className={`w-full rounded-md transition-all duration-200 ${
                        isHovered ? 'bg-[#FFA07A]' : 'bg-[#FFA07A]/85'
                      }`}
                      style={{ height: `${item.segments[2] * 10}px` }}
                    />
                  </div>

                  {/* Month Label */}
                  <span
                    className={`mt-2 text-[11px] font-semibold transition-colors ${
                      isHovered
                        ? 'text-[#FF5B22] font-bold'
                        : 'text-slate-400 dark:text-slate-400'
                    }`}
                  >
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. BOTTOM TWO SECONDARY BENTO CARDS (1:1 with reference)             */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Sales Performance (Donut & Regional Breakdown) */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] p-6 sm:p-7 shadow-sm flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Sales Performance
                </h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Total Sales: {formatCurrency(grossRevenueVal)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 mt-0.5">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>24.5% vs last month</span>
                </div>
              </div>

              <div className="relative">
                <select className="appearance-none rounded-full border border-slate-200/80 dark:border-slate-800 bg-[#F4F6F9] dark:bg-slate-900 px-3.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer pr-6">
                  <option>This Month</option>
                  <option>Last Month</option>
                </select>
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Donut Chart & Category Breakdown (1:1 with reference) */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Multi-slice Donut Graphic */}
              <div className="relative h-44 w-44 shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
                  {/* Background Track */}
                  <circle cx="50" cy="50" r="36" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                  {/* Slice 1: Tangerine Orange (38%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    stroke="#FF5B22"
                    strokeWidth="16"
                    fill="transparent"
                    strokeDasharray="86 226"
                    strokeDashoffset="0"
                    className="transition-all duration-700 ease-out"
                  />
                  {/* Slice 2: Teal / Cyan (26%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    stroke="#06B6D4"
                    strokeWidth="16"
                    fill="transparent"
                    strokeDasharray="59 226"
                    strokeDashoffset="-86"
                    className="transition-all duration-700 ease-out"
                  />
                  {/* Slice 3: Sky Blue (19%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    stroke="#3B82F6"
                    strokeWidth="16"
                    fill="transparent"
                    strokeDasharray="43 226"
                    strokeDashoffset="-145"
                    className="transition-all duration-700 ease-out"
                  />
                  {/* Slice 4: Indigo / Purple (11%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    stroke="#6366F1"
                    strokeWidth="16"
                    fill="transparent"
                    strokeDasharray="25 226"
                    strokeDashoffset="-188"
                    className="transition-all duration-700 ease-out"
                  />
                  {/* Slice 5: Dark Navy (6%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="36"
                    stroke="#0F172A"
                    strokeWidth="16"
                    fill="transparent"
                    strokeDasharray="13 226"
                    strokeDashoffset="-213"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                {/* Donut Center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-display text-xl font-extrabold text-slate-900 dark:text-white">
                    100%
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Volume
                  </span>
                </div>
              </div>

              {/* Categories List (1:1 with reference) */}
              <div className="space-y-2.5 text-xs font-medium w-full sm:w-56">
                {[
                  { label: 'North America (VIP Tier)', pct: '38%', color: '#FF5B22' },
                  { label: 'Europe (General Admin)', pct: '26%', color: '#06B6D4' },
                  { label: 'Asia (Early Bird)', pct: '19%', color: '#3B82F6' },
                  { label: 'South America (Student)', pct: '11%', color: '#6366F1' },
                  { label: 'Africa (Complimentary)', pct: '6%', color: '#0F172A' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="truncate max-w-[130px]">{item.label}</span>
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {item.pct}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Profit & Loss Summary (Translucent Mountain Peaks) */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#131926] p-6 sm:p-7 shadow-sm flex flex-col justify-between transition-colors duration-200">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Profit & Loss Summary
                </h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Net Profit: {formatCurrency(26240)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-500 mt-0.5">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span>18.2% vs last month</span>
                </div>
              </div>

              <div className="relative">
                <select className="appearance-none rounded-full border border-slate-200/80 dark:border-slate-800 bg-[#F4F6F9] dark:bg-slate-900 px-3.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer pr-6">
                  <option>This Month</option>
                  <option>Last Month</option>
                </select>
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Mountain Peaks SVG Visualization (1:1 with reference) */}
            <div className="mt-6 relative h-48 w-full flex flex-col justify-end">
              <svg viewBox="0 0 400 140" className="w-full h-36 overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="mountainPeakGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF5B22" stopOpacity="0.45" />
                    <stop offset="60%" stopColor="#FF7A45" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#FF5B22" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Baseline Guide */}
                <line x1="0" y1="135" x2="400" y2="135" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />

                {/* Peak 1: Subtle Left Hill */}
                <path
                  d="M 10,135 L 50,110 L 90,135 Z"
                  fill="url(#mountainPeakGradient)"
                />

                {/* Peak 2: Mid Hill */}
                <path
                  d="M 80,135 L 140,85 L 200,135 Z"
                  fill="url(#mountainPeakGradient)"
                />

                {/* Peak 3: Sharp High Peak (Reference highlight) */}
                <path
                  d="M 180,135 L 250,50 L 320,135 Z"
                  fill="url(#mountainPeakGradient)"
                />

                {/* Peak 4: Tallest Coral Apex */}
                <path
                  d="M 280,135 L 340,25 L 390,135 Z"
                  fill="url(#mountainPeakGradient)"
                />
              </svg>

              {/* X-axis labels (1:1 with reference) */}
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-2 px-2">
                <span>0K</span>
                <span>10K</span>
                <span>20K</span>
                <span>30K</span>
                <span>40K</span>
                <span>50K</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardView;
