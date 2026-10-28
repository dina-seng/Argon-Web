import { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
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

export const FALLBACK_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'log-001',
    actorId: 'usr-admin-root',
    actor: {
      id: 'usr-admin-root',
      email: 'admin@argon.events',
      name: 'Sophea Root',
      role: 'ADMIN',
    },
    action: 'BOOKING_FORCE_CONFIRMED',
    entity: 'Booking',
    entityId: 'b8a1c902-7491-4123-9c88-102938475610',
    metadata: {
      reason: 'Admin manual resolution for dropped Bakong webhook',
      previousStatus: 'PENDING',
      newStatus: 'PAID',
      ticketsCreated: 1,
      tierId: 'tier-vip',
      khqrRef: 'KHQR_MD5_9a8f7c6e5d4b3a21',
      settlementAmountUsd: 75.0,
    },
    createdAt: '2026-10-28T07:00:15.000Z',
  },
  {
    id: 'log-002',
    actorId: 'usr-admin-root',
    actor: {
      id: 'usr-admin-root',
      email: 'admin@argon.events',
      name: 'Sophea Root',
      role: 'ADMIN',
    },
    action: 'USER_ROLE_PROMOTED',
    entity: 'User',
    entityId: 'usr-cadt-organizer',
    metadata: {
      previousRole: 'CUSTOMER',
      newRole: 'ORGANIZER',
      reason: 'Approved CADT hackathon coordinator application',
      promotedBy: 'admin@argon.events',
    },
    createdAt: '2026-10-28T06:42:00.000Z',
  },
  {
    id: 'log-003',
    actorId: 'usr-barcamp-org',
    actor: {
      id: 'usr-barcamp-org',
      email: 'organizer@barcamp.asia',
      name: 'Chantha Sok',
      role: 'ORGANIZER',
    },
    action: 'TIER_QUOTA_MODIFIED',
    entity: 'TicketTier',
    entityId: 'tier-early-bird',
    metadata: {
      tierName: 'Early Bird Pass',
      previousCapacity: 100,
      newCapacity: 150,
      eventId: 'b8c1a9f0-4281-4357-9d22-108191283901',
      delta: 50,
    },
    createdAt: '2026-10-28T05:15:30.000Z',
  },
  {
    id: 'log-004',
    actorId: 'usr-admin-root',
    actor: {
      id: 'usr-admin-root',
      email: 'admin@argon.events',
      name: 'Sophea Root',
      role: 'ADMIN',
    },
    action: 'BOOKING_REFUNDED',
    entity: 'Booking',
    entityId: 'f2e5a346-1835-8567-d022-546372819054',
    metadata: {
      reason: 'Disputed charge settlement via customer service',
      refundAmount: 75.0,
      revokedTicketsCount: 1,
      ticketIds: ['argon_tkt_rev_91823'],
      restoredTierCapacity: 1,
    },
    createdAt: '2026-10-27T16:21:00.000Z',
  },
  {
    id: 'log-005',
    actorId: 'usr-admin-root',
    actor: {
      id: 'usr-admin-root',
      email: 'admin@argon.events',
      name: 'Sophea Root',
      role: 'ADMIN',
    },
    action: 'USER_ROLE_UPDATED',
    entity: 'User',
    entityId: 'usr-customer-3',
    metadata: {
      previousRole: 'ORGANIZER',
      newRole: 'CUSTOMER',
      reason: 'Seasonal access expiry',
    },
    createdAt: '2026-10-26T12:00:00.000Z',
  },
];

export interface AuditLogsViewProps {
  pageSize?: number;
}

export function AuditLogsView({ pageSize = 10 }: AuditLogsViewProps) {
  const [logs, setLogs] = useState<AuditLogItem[]>(FALLBACK_AUDIT_LOGS);
  const [totalLogs, setTotalLogs] = useState<number>(FALLBACK_AUDIT_LOGS.length);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOfflineFallback, setIsOfflineFallback] = useState<boolean>(false);

  // Expanded row IDs for JSON metadata
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({
    'log-001': true, // default first one expanded for instant clarity
  });

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const fetchAuditLogs = useCallback(
    async (page: number, action: string, entity: string) => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('page', String(page));
        queryParams.set('limit', String(pageSize));
        if (action !== 'ALL') queryParams.set('action', action);
        if (entity !== 'ALL') queryParams.set('entity', entity);

        const res = await api.get<PaginatedAuditLogsResponse>(
          `/api/v1/admin/audit?${queryParams.toString()}`
        );

        if (res && Array.isArray(res.data)) {
          setLogs(res.data);
          setTotalLogs(res.total);
          setCurrentPage(res.page);
          setTotalPages(res.totalPages || Math.ceil(res.total / pageSize) || 1);
          setIsOfflineFallback(false);
        } else {
          throw new Error('Invalid audit log response');
        }
      } catch {
        // Fallback filter locally
        setIsOfflineFallback(true);
        let filtered = FALLBACK_AUDIT_LOGS;
        if (action !== 'ALL') {
          filtered = filtered.filter((l) => l.action === action);
        }
        if (entity !== 'ALL') {
          filtered = filtered.filter((l) => l.entity === entity);
        }
        setTotalLogs(filtered.length);
        setTotalPages(Math.ceil(filtered.length / pageSize) || 1);
        const startIndex = (page - 1) * pageSize;
        setLogs(filtered.slice(startIndex, startIndex + pageSize));
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
    if (action.includes('REFUND')) return 'error';
    if (action.includes('FORCE')) return 'warning';
    if (action.includes('PROMOTED')) return 'success';
    if (action.includes('TIER') || action.includes('QUOTA')) return 'warning';
    return 'info';
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
          second: '2-digit',
        })
      );
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-white pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
              System Audit Logs & Governance Trail
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              Immutable
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            Cryptographic ledger tracking administrative overrides, role promotions, and critical inventory mutations.
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          onClick={() => fetchAuditLogs(currentPage, actionFilter, entityFilter)}
          isLoading={isLoading}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Refresh Logs</span>
        </Button>
      </div>

      {/* Offline Standalone Notice */}
      {isOfflineFallback && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>
              <strong>Local Mock View:</strong> Displaying simulated audit logs from persistent ledger cache.
            </span>
          </div>
          <span className="font-mono text-[11px] text-amber-400/80">Offline Mode</span>
        </div>
      )}

      {/* Filter Tabs Toolbar */}
      <Card className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider mr-1">
              Action:
            </span>
            {[
              { id: 'ALL', label: 'All Actions' },
              { id: 'BOOKING_FORCE_CONFIRMED', label: 'Force Confirmed' },
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
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  actionFilter === tab.id
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-gray-400 hover:text-white bg-surface-elevated hover:bg-white/5 border border-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              Entity:
            </span>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-white/10 bg-surface-elevated px-3 py-1.5 text-xs font-medium text-white shadow-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Entities</option>
              <option value="Booking">Booking</option>
              <option value="User">User</option>
              <option value="TicketTier">TicketTier</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-elevated/70 border-b border-white/10 text-xs font-mono uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-6 py-3.5 w-10"></th>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Action</th>
                <th className="px-6 py-3.5">Actor</th>
                <th className="px-6 py-3.5">Entity & ID</th>
                <th className="px-6 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="h-8 w-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      <span className="font-medium text-white">No audit records found</span>
                      <span className="text-xs text-gray-400">Try selecting a broader filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = Boolean(expandedLogIds[log.id]);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-white/[0.02] transition-colors group align-top"
                    >
                      {/* Expand Chevron */}
                      <td className="pl-6 py-4">
                        <button
                          type="button"
                          onClick={() => toggleExpand(log.id)}
                          className="text-gray-400 hover:text-white transition-transform"
                          aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                        >
                          <svg
                            className={`h-4 w-4 transition-transform duration-200 ${
                              isExpanded ? 'rotate-90 text-emerald-400' : ''
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
                      <td className="px-6 py-4 font-mono text-xs text-gray-300 whitespace-nowrap">
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
                        <div className="font-semibold text-white text-xs">
                          {log.actor?.name || log.actor?.email || log.actorId}
                        </div>
                        {log.actor?.email && (
                          <div className="font-mono text-[11px] text-gray-400">
                            {log.actor.email}
                          </div>
                        )}
                        {log.actor?.role && (
                          <span className="inline-block mt-0.5 text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-gray-400 border border-white/10">
                            {log.actor.role}
                          </span>
                        )}
                      </td>

                      {/* Entity & ID */}
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs font-semibold text-white">
                          {log.entity}
                        </div>
                        <div className="font-mono text-[11px] text-gray-400 truncate max-w-xs">
                          #{log.entityId}
                        </div>
                      </td>

                      {/* Details toggle button */}
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => toggleExpand(log.id)}
                          className="text-xs font-mono text-emerald-400 hover:text-emerald-300 font-medium"
                        >
                          {isExpanded ? 'Hide Payload' : 'View Payload'}
                        </button>

                        {/* Expandable JSON Payload */}
                        {isExpanded && (
                          <div className="mt-3 text-left">
                            <div className="rounded-xl border border-white/10 bg-surface-elevated/90 p-3.5 shadow-inner">
                              <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                                <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">
                                  Audit Payload Metadata
                                </span>
                                <span className="font-mono text-[10px] text-gray-500">
                                  UUID: {log.id}
                                </span>
                              </div>
                              <pre className="font-mono text-[11px] text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-48 leading-relaxed">
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
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-3.5 bg-surface-elevated/30">
          <div className="text-xs text-gray-400">
            Showing <span className="font-mono text-white font-medium">{logs.length}</span> of{' '}
            <span className="font-mono text-white font-medium">{totalLogs}</span> audit records
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-xs font-mono text-gray-300 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default AuditLogsView;
