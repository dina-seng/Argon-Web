import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../lib/api';

export interface AuditActor {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  actor?: AuditActor | null;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginatedAuditLogsResponse {
  data: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogsViewProps {
  pageSize?: number;
}

export function AuditLogsView({ pageSize = 10 }: AuditLogsViewProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded row IDs for JSON metadata
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const fetchAuditLogs = useCallback(
    async (page: number, action: string, entity: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('page', String(page));
        queryParams.set('limit', String(pageSize));
        if (action !== 'ALL') queryParams.set('action', action);
        if (entity !== 'ALL') queryParams.set('entity', entity);

        let res: PaginatedAuditLogsResponse;
        try {
          res = await api.get<PaginatedAuditLogsResponse>(
            `/api/v1/admin/audit?${queryParams.toString()}`
          );
        } catch (err: unknown) {
          if (err instanceof Error && err.message.includes('404')) {
            res = await api.get<PaginatedAuditLogsResponse>(
              `/admin/audit?${queryParams.toString()}`
            );
          } else {
            throw err;
          }
        }

        if (res && Array.isArray(res.data)) {
          setLogs(res.data);
          setTotalLogs(res.total);
          setCurrentPage(res.page);
          setTotalPages(res.totalPages || Math.ceil(res.total / pageSize) || 1);
          setError(null);
        } else {
          throw new Error('Invalid audit log response format');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to retrieve system audit logs.';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    fetchAuditLogs(currentPage, actionFilter, entityFilter);
  }, [currentPage, actionFilter, entityFilter, fetchAuditLogs]);

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('REFUND') || action.includes('CANCEL') || action.includes('REVOKE')) return 'error';
    if (action.includes('CHECKED_IN') || action.includes('CONFIRMED') || action.includes('PROMOTED')) return 'success';
    if (action.includes('OVERRIDE') || action.includes('MODIFIED') || action.includes('UPDATED') || action.includes('QUOTA')) return 'warning';
    return 'info';
  };

  const exportCsv = () => {
    if (logs.length === 0) return;
    const headers = ['Log ID', 'Timestamp', 'Action', 'Actor Name', 'Actor Email', 'Actor Role', 'Entity', 'Entity ID', 'Metadata'];
    const rows = logs.map((l) => [
      l.id,
      l.createdAt,
      l.action,
      l.actor?.name || '',
      l.actor?.email || '',
      l.actor?.role || '',
      l.entity,
      l.entityId,
      JSON.stringify(l.metadata ?? {}),
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `argon_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return (
        date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }) +
        ' ' +
        date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/70 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white">
              System Audit Trail
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border border-orange-200 dark:border-orange-900/60 bg-orange-50 dark:bg-orange-950/40 text-[#FF5B22]">
              {totalLogs} Events
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Append-only security log tracking administrative overrides, refunds, quota edits, and access elevation.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="md"
            onClick={exportCsv}
            disabled={logs.length === 0}
            className="flex items-center gap-2 rounded-2xl bg-white dark:bg-[#131926] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <svg className="h-4 w-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-semibold text-xs">Export CSV</span>
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => fetchAuditLogs(currentPage, actionFilter, entityFilter)}
            isLoading={isLoading}
            className="flex items-center gap-2 rounded-2xl bg-white dark:bg-[#131926] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <svg className="h-4 w-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="font-semibold text-xs">Refresh Logs</span>
          </Button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 px-5 py-4 text-sm text-rose-700 dark:text-rose-400">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 shrink-0 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">
              <strong>API Error:</strong> {error}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchAuditLogs(currentPage, actionFilter, entityFilter)}
            className="rounded-full bg-white dark:bg-[#131926] text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Filter Tabs Toolbar */}
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider mr-1 font-bold">
              Action:
            </span>
            {[
              { id: 'ALL', label: 'All Actions' },
              { id: 'EVENT_STATUS_UPDATED', label: 'Event Moderated' },
              { id: 'TICKET_CHECKED_IN', label: 'Check-In Override' },
              { id: 'BOOKING_FORCE_CONFIRMED', label: 'Confirmed' },
              { id: 'BOOKING_REFUNDED', label: 'Refunded' },
              { id: 'USER_ROLE_PROMOTED', label: 'Role Promoted' },
              { id: 'USER_ROLE_UPDATED', label: 'Role Updated' },
              { id: 'TIER_QUOTA_MODIFIED', label: 'Tier Quota' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActionFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  actionFilter === tab.id
                    ? 'bg-[#FF5B22] text-white shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200/80 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Entity:
            </span>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm focus:border-[#FF5B22] focus:outline-none"
            >
              <option value="ALL">All Entities</option>
              <option value="Booking">Booking</option>
              <option value="User">User</option>
              <option value="Event">Event</option>
              <option value="Ticket">Ticket</option>
              <option value="TicketTier">TicketTier</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#131926] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Entity & ID</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#FF5B22] border-t-transparent" />
                      <span className="text-xs text-slate-500 font-mono font-medium">Loading immutable audit logs…</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="h-8 w-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">No audit records found</span>
                      <span className="text-xs text-slate-400">Try selecting a broader filter or resetting criteria.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = Boolean(expandedLogIds[log.id]);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group align-top"
                    >
                      {/* Expand Chevron */}
                      <td className="pl-6 py-4">
                        <button
                          type="button"
                          onClick={() => toggleExpand(log.id)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-transform"
                          aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                        >
                          <svg
                            className={`h-4 w-4 transition-transform duration-200 ${
                              isExpanded ? 'rotate-90 text-[#FF5B22]' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>

                      {/* Timestamp */}
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>

                      {/* Action Badge */}
                      <td className="px-6 py-4">
                        <Badge
                          label={log.action}
                          variant={getActionBadgeVariant(log.action)}
                          className="font-mono text-[11px]"
                        />
                      </td>

                      {/* Actor */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white text-xs">
                          {log.actor?.name || log.actor?.email || log.actorId}
                        </div>
                        {log.actor?.email && (
                          <div className="font-mono text-[11px] text-slate-400">
                            {log.actor.email}
                          </div>
                        )}
                        {log.actor?.role && (
                          <span className="inline-block mt-0.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
                            {log.actor.role}
                          </span>
                        )}
                      </td>

                      {/* Entity & ID */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {log.entity}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400 truncate max-w-xs">
                          #{log.entityId}
                        </div>
                      </td>

                      {/* Details toggle button */}
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => toggleExpand(log.id)}
                          className="text-xs font-mono text-[#FF5B22] hover:text-[#e04f1c] font-semibold"
                        >
                          {isExpanded ? 'Hide Payload' : 'View Payload'}
                        </button>

                        {/* Expandable JSON Payload */}
                        {isExpanded && (
                          <div className="mt-3 text-left">
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 p-4 shadow-inner">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-2">
                                <span className="font-mono text-[10px] uppercase tracking-wider text-[#FF5B22] font-bold">
                                  Audit Payload Metadata
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  UUID: {log.id}
                                </span>
                              </div>
                              <pre className="font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap overflow-x-auto max-h-48 leading-relaxed">
                                {JSON.stringify(log.metadata ?? { info: 'No extra metadata recorded' }, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing <span className="font-mono text-slate-900 dark:text-white font-bold">{logs.length}</span> of{' '}
            <span className="font-mono text-slate-900 dark:text-white font-bold">{totalLogs}</span> audit records
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-2xl bg-white dark:bg-[#161D2E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Previous
            </Button>
            <span className="text-xs font-mono text-slate-600 dark:text-slate-400 px-2 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-2xl bg-white dark:bg-[#161D2E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuditLogsView;
