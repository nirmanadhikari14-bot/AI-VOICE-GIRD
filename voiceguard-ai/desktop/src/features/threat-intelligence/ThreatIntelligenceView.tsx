import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { desktopApiClient } from '../../api/client';
import { DESKTOP_ENDPOINTS } from '../../api/endpoints';
import { ThreatIndicator } from '../../types';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/tokens';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Skeleton, EmptyState, ErrorBanner } from '../../components/common/Feedback';
import { formatDateTime } from '../../utils/formatters';
import { exportService } from '../../services/export/exportService';

export const ThreatIntelligenceView: React.FC = () => {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [type, setType] = useState('phone');
  const [value, setValue] = useState('');
  const [severity, setSeverity] = useState('high');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: indicators = [], isLoading } = useQuery<ThreatIndicator[]>({
    queryKey: ['threats'],
    queryFn: async () => {
      const res = await desktopApiClient.get<any>(DESKTOP_ENDPOINTS.THREAT_INDICATORS);
      return Array.isArray(res) ? res : res.items || [];
    },
    refetchInterval: 10000,
  });

  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      await desktopApiClient.post(DESKTOP_ENDPOINTS.CREATE_THREAT_INDICATOR, payload);
    },
    onSuccess: () => {
      setShowAddForm(false);
      setValue('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['threats'] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to submit threat indicator');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    addMutation.mutate({
      type,
      value: value.trim(),
      severity,
      description: description.trim() || undefined,
    });
  };

  const handleExport = async () => {
    await exportService.exportCsv(
      indicators.map((i) => ({
        id: i.id,
        type: i.type,
        value: i.value,
        severity: i.severity,
        reputationScore: i.reputationScore,
        createdAt: i.createdAt,
      })),
      `threat-indicators-${Date.now()}.csv`
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
        <div>
          <h2 style={{ fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold, color: colors.textPrimary, margin: 0 }}>
            Phase 16 — Global Threat Intelligence & IOC Vault
          </h2>
          <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary }}>
            Indicators of Compromise (IOCs), synthetic voice hashes, spoofed carrier origins, and reputation scoring
          </div>
        </div>

        <div style={{ display: 'flex', gap: spacing.sm }}>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            📥 Export CSV
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : '+ Add Threat IOC'}
          </Button>
        </div>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      {/* Add Indicator Form Drawer/Card */}
      {showAddForm && (
        <Card title="Add Threat Indicator (IOC)">
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: spacing.md }}>
              <div>
                <label style={{ display: 'block', fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginBottom: 4 }}>
                  IOC Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: colors.bgTertiary,
                    border: `1px solid ${colors.borderSubtle}`,
                    color: colors.textPrimary,
                    padding: '8px 12px',
                    borderRadius: 6,
                    outline: 'none',
                  }}
                >
                  <option value="phone">Phone Number</option>
                  <option value="ip">IP Address</option>
                  <option value="voice_hash">Voiceprint Hash</option>
                  <option value="carrier">Telecom Carrier</option>
                </select>
              </div>

              <Input
                label="Indicator Value"
                placeholder="+15550001234 or hash"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />

              <div>
                <label style={{ display: 'block', fontSize: typography.fontSizes.xs, color: colors.textSecondary, marginBottom: 4 }}>
                  Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: colors.bgTertiary,
                    border: `1px solid ${colors.borderSubtle}`,
                    color: colors.textPrimary,
                    padding: '8px 12px',
                    borderRadius: 6,
                    outline: 'none',
                  }}
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <Input
              label="Description / Context"
              placeholder="e.g. Associated with widespread CEO wire fraud impersonation campaign"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.sm }}>
              <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={addMutation.isPending}>
                {addMutation.isPending ? 'Saving...' : 'Add Indicator'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Indicators Table */}
      {isLoading ? (
        <Skeleton height={200} />
      ) : indicators.length === 0 ? (
        <EmptyState
          title="No Threat Indicators Found"
          description="The threat intelligence database is currently empty. Add IOCs above to populate."
        />
      ) : (
        <Card title={`Active Threat Indicators (${indicators.length})`}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: typography.fontSizes.sm }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, color: colors.textMuted }}>
                  <th style={{ padding: spacing.sm }}>Type</th>
                  <th style={{ padding: spacing.sm }}>Indicator Value</th>
                  <th style={{ padding: spacing.sm }}>Severity</th>
                  <th style={{ padding: spacing.sm }}>Reputation Score</th>
                  <th style={{ padding: spacing.sm }}>Description</th>
                  <th style={{ padding: spacing.sm }}>Logged</th>
                </tr>
              </thead>
              <tbody>
                {indicators.map((ioc) => (
                  <tr key={ioc.id} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: spacing.sm }}>
                      <Badge variant="info">{ioc.type.toUpperCase()}</Badge>
                    </td>
                    <td style={{ padding: spacing.sm, fontWeight: typography.fontWeights.bold, color: colors.textPrimary }}>
                      <code>{ioc.value}</code>
                    </td>
                    <td style={{ padding: spacing.sm }}>
                      <Badge variant={ioc.severity}>{ioc.severity.toUpperCase()}</Badge>
                    </td>
                    <td style={{ padding: spacing.sm, color: colors.statusCritical, fontWeight: 'bold' }}>
                      {ioc.reputationScore !== undefined ? ioc.reputationScore.toFixed(2) : '0.85'}
                    </td>
                    <td style={{ padding: spacing.sm, color: colors.textSecondary }}>
                      {ioc.description || 'Known malicious caller fingerprint'}
                    </td>
                    <td style={{ padding: spacing.sm, color: colors.textMuted, fontSize: typography.fontSizes.xs }}>
                      {formatDateTime(ioc.createdAt)}
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

