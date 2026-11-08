import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { desktopApiClient } from '../../api/client';
import { DESKTOP_ENDPOINTS } from '../../api/endpoints';
import { AuditLogEntry } from '../../types';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/tokens';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Skeleton, EmptyState } from '../../components/common/Feedback';
import { formatDateTime } from '../../utils/formatters';
import { exportService } from '../../services/export/exportService';

export const AuditLogsView: React.FC = () => {
  const [filterQuery, setFilterQuery] = useState('');

  const { data: logs = [], isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ['audit', 'logs'],
    queryFn: async () => {
      const res = await desktopApiClient.get<any>(DESKTOP_ENDPOINTS.AUDIT_LOGS);
      return Array.isArray(res) ? res : res.items || [];
    },
    refetchInterval: 10000,
  });

  const filteredLogs = logs.filter((log) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      (log.userEmail && log.userEmail.toLowerCase().includes(q)) ||
      (log.details && JSON.stringify(log.details).toLowerCase().includes(q))
    );
  });

  const handleExportCsv = async () => {
    await exportService.exportCsv(
      filteredLogs.map((l) => ({
        id: l.id,
        action: l.action,
        userEmail: l.userEmail,
        ipAddress: l.ipAddress,
        createdAt: l.createdAt,
      })),
      `audit-logs-${Date.now()}.csv`
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
        <div>
          <h2 style={{ fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold, color: colors.textPrimary, margin: 0 }}>
            Immutable SOC Audit Trail & Forensic Accountability
          </h2>
          <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary }}>
            Cryptographically signed analyst operations, prevention authorizations, and system state transitions
          </div>
        </div>

        <div style={{ display: 'flex', gap: spacing.sm }}>
          <Button variant="secondary" size="sm" onClick={handleExportCsv}>
            📥 Export Audit CSV
          </Button>
        </div>
      </div>

      {/* Filter Input */}
      <div style={{ maxWidth: 450 }}>
        <Input
          placeholder="Filter logs by action, analyst email, or keyword..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
        />
      </div>

      {/* Audit Table */}
      {isLoading ? (
        <Skeleton height={200} />
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          title="No Audit Logs Found"
          description="No operations matching your search criteria have been recorded in the audit log."
        />
      ) : (
        <Card title={`Recorded Audit Events (${filteredLogs.length})`}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: typography.fontSizes.sm }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, color: colors.textMuted }}>
                  <th style={{ padding: spacing.sm }}>Timestamp</th>
                  <th style={{ padding: spacing.sm }}>Action</th>
                  <th style={{ padding: spacing.sm }}>Analyst</th>
                  <th style={{ padding: spacing.sm }}>IP Origin</th>
                  <th style={{ padding: spacing.sm }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: spacing.sm, fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td style={{ padding: spacing.sm }}>
                      <Badge variant="info">{log.action}</Badge>
                    </td>
                    <td style={{ padding: spacing.sm, fontWeight: typography.fontWeights.medium, color: colors.textPrimary }}>
                      {log.userEmail || 'System'}
                    </td>
                    <td style={{ padding: spacing.sm, fontSize: typography.fontSizes.xs, color: colors.textSecondary }}>
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td style={{ padding: spacing.sm, fontSize: typography.fontSizes.xs, color: colors.textSecondary }}>
                      {log.details ? (
                        <code>{typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}</code>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

