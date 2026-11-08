import React, { useState } from 'react';
import { useIncidents } from './useIncidents';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatRelativeTime } from '../../utils/formatters';

interface IncidentListScreenProps {
  onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export const IncidentListScreen: React.FC<IncidentListScreenProps> = ({ onNavigate }) => {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { incidents, isLoading, refetch } = useIncidents(statusFilter);

  const statuses = [
    { label: 'All', value: undefined },
    { label: 'Open', value: 'open' },
    { label: 'Investigating', value: 'investigating' },
    { label: 'Resolved', value: 'resolved' },
  ];

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: colors.bgPrimary,
        color: colors.textPrimary,
        minHeight: '100vh',
        overflowY: 'auto',
        paddingBottom: spacing.hero,
      }}
    >
      <Header
        title="Security Incidents"
        subtitle="Phase 21 Incident Management & Triage"
        rightAction={
          <Button
            size="sm"
            variant="primary"
            onClick={() => onNavigate('CreateIncident')}
          >
            + New
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: spacing.xs,
          padding: `${spacing.sm}px ${spacing.base}px`,
          backgroundColor: colors.bgSecondary,
          borderBottom: `1px solid ${colors.borderSubtle}`,
        }}
      >
        {statuses.map((s) => {
          const isSelected = statusFilter === s.value;
          return (
            <button
              key={s.label}
              onClick={() => setStatusFilter(s.value)}
              style={{
                backgroundColor: isSelected ? colors.accentOrange : colors.bgElevated,
                color: isSelected ? '#ffffff' : colors.textSecondary,
                border: `1px solid ${isSelected ? colors.accentOrange : colors.borderSubtle}`,
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: typography.fontSizes.xs,
                cursor: 'pointer',
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: spacing.base }}>
        {isLoading ? (
          <div>
            <Skeleton height={90} />
            <Skeleton height={90} />
          </div>
        ) : incidents.length > 0 ? (
          incidents.map((inc) => (
            <Card
              key={inc.id}
              onClick={() => onNavigate('IncidentDetail', { incidentId: inc.id })}
              style={{ marginBottom: spacing.sm }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                    <span
                      style={{
                        fontSize: typography.fontSizes.xs,
                        fontFamily: 'monospace',
                        color: colors.accentCyan,
                        fontWeight: 'bold',
                      }}
                    >
                      {inc.incident_number}
                    </span>
                    <Badge severity={inc.severity} />
                  </div>
                  <h3
                    style={{
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.semibold,
                      color: colors.textPrimary,
                      margin: '4px 0 2px 0',
                    }}
                  >
                    {inc.title}
                  </h3>
                  <p
                    style={{
                      fontSize: typography.fontSizes.xs,
                      color: colors.textSecondary,
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {inc.summary || 'No summary provided.'}
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                    {formatRelativeTime(inc.created_at)}
                  </span>
                  <div style={{ marginTop: 6 }}>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        backgroundColor:
                          inc.status === 'open'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : inc.status === 'investigating'
                            ? 'rgba(245, 158, 11, 0.2)'
                            : 'rgba(16, 185, 129, 0.2)',
                        color:
                          inc.status === 'open'
                            ? colors.threatCritical
                            : inc.status === 'investigating'
                            ? colors.warning
                            : colors.accentGreen,
                        fontWeight: 'bold',
                      }}
                    >
                      {inc.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: spacing.sm,
                  paddingTop: spacing.xs,
                  borderTop: `1px solid ${colors.borderSubtle}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: typography.fontSizes.xs,
                  color: colors.textMuted,
                }}
              >
                <span>Assigned: {inc.assigned_to || 'Unassigned'}</span>
                <span>Priority: {inc.priority.toUpperCase()}</span>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No Incidents in Queue"
            description="No active incidents match the current filter criteria."
            actionLabel="+ Open Incident"
            onAction={() => onNavigate('CreateIncident')}
          />
        )}
      </div>
    </div>
  );
};
