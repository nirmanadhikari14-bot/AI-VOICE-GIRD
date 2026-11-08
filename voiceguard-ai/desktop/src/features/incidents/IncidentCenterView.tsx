import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { desktopApiClient } from '../../api/client';
import { DESKTOP_ENDPOINTS } from '../../api/endpoints';
import { SecurityIncident, IncidentNote } from '../../types';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/tokens';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Skeleton, EmptyState, ErrorBanner } from '../../components/common/Feedback';
import { formatDateTime, formatRelativeTime } from '../../utils/formatters';
import { exportService } from '../../services/export/exportService';

export const IncidentCenterView: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: incidents = [], isLoading } = useQuery<SecurityIncident[]>({
    queryKey: ['incidents'],
    queryFn: async () => {
      const res = await desktopApiClient.get<any>(DESKTOP_ENDPOINTS.INCIDENTS);
      return Array.isArray(res) ? res : res.items || [];
    },
    refetchInterval: 5000,
  });

  const activeIncident =
    incidents.find((i) => i.id === selectedIncidentId) || incidents[0] || null;

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await desktopApiClient.patch(DESKTOP_ENDPOINTS.INCIDENT_STATUS(id), { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to update incident status');
    },
  });

  const noteMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      await desktopApiClient.post(DESKTOP_ENDPOINTS.INCIDENT_NOTES(id), { note });
    },
    onSuccess: () => {
      setNewNote('');
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to post investigation note');
    },
  });

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !activeIncident) return;
    noteMutation.mutate({ id: activeIncident.id, note: newNote.trim() });
  };

  const handleExportIncident = async (incident: SecurityIncident) => {
    await exportService.exportJson(incident, `incident-${incident.id}.json`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
        <div>
          <h2 style={{ fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold, color: colors.textPrimary, margin: 0 }}>
            Phase 21 — Security Incident Response & Case Triage
          </h2>
          <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary }}>
            Formal case handling, investigator notes, evidence correlation, and lifecycle tracking
          </div>
        </div>

        {activeIncident && (
          <Button variant="secondary" size="sm" onClick={() => handleExportIncident(activeIncident)}>
            📥 Export Case File
          </Button>
        )}
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

      {isLoading ? (
        <Skeleton height={240} />
      ) : incidents.length === 0 ? (
        <EmptyState
          title="No Open Security Incidents"
          description="There are currently no security incidents in the triage queue."
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: spacing.lg }}>
          {/* Left Column: Incidents Queue */}
          <div
            style={{
              backgroundColor: colors.bgSecondary,
              borderRadius: 8,
              border: `1px solid ${colors.borderSubtle}`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 200px)',
            }}
          >
            <div
              style={{
                padding: spacing.md,
                borderBottom: `1px solid ${colors.borderSubtle}`,
                fontWeight: typography.fontWeights.bold,
                fontSize: typography.fontSizes.sm,
                color: colors.textPrimary,
              }}
            >
              Incidents Queue ({incidents.length})
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {incidents.map((incident) => {
                const isSelected = activeIncident?.id === incident.id;
                return (
                  <div
                    key={incident.id}
                    onClick={() => setSelectedIncidentId(incident.id)}
                    style={{
                      padding: spacing.md,
                      borderBottom: `1px solid ${colors.borderSubtle}`,
                      backgroundColor: isSelected ? colors.bgTertiary : 'transparent',
                      borderLeft: isSelected ? `4px solid ${colors.accentOrange}` : '4px solid transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Badge variant={incident.severity}>{incident.severity.toUpperCase()}</Badge>
                      <Badge variant={incident.status === 'open' ? 'warning' : 'neutral'}>
                        {incident.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    <div style={{ fontWeight: typography.fontWeights.bold, fontSize: typography.fontSizes.sm, color: colors.textPrimary }}>
                      {incident.title}
                    </div>

                    <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                      Case {incident.id} • {formatRelativeTime(incident.createdAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Case Details & Timeline */}
          {activeIncident && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing.md }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: 4 }}>
                      <span style={{ fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, color: colors.textPrimary }}>
                        {activeIncident.title}
                      </span>
                      <Badge variant={activeIncident.severity}>{activeIncident.severity.toUpperCase()}</Badge>
                    </div>
                    <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary }}>
                      {activeIncident.description}
                    </div>
                    <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, marginTop: 6 }}>
                      Assigned To: <strong>{activeIncident.assignedTo || 'Unassigned'}</strong> • Created: {formatDateTime(activeIncident.createdAt)}
                    </div>
                  </div>

                  {/* Status Lifecycle Buttons */}
                  <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
                    <Button
                      variant={activeIncident.status === 'open' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => statusMutation.mutate({ id: activeIncident.id, status: 'open' })}
                    >
                      Open
                    </Button>
                    <Button
                      variant={activeIncident.status === 'investigating' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => statusMutation.mutate({ id: activeIncident.id, status: 'investigating' })}
                    >
                      Investigating
                    </Button>
                    <Button
                      variant={activeIncident.status === 'resolved' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => statusMutation.mutate({ id: activeIncident.id, status: 'resolved' })}
                    >
                      Resolved
                    </Button>
                    <Button
                      variant={activeIncident.status === 'closed' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => statusMutation.mutate({ id: activeIncident.id, status: 'closed' })}
                    >
                      Closed
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Investigator Notes & Timeline */}
              <Card title="Investigation Notes & Chronology">
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.md }}>
                  {(!activeIncident.notes || activeIncident.notes.length === 0) ? (
                    <div style={{ color: colors.textMuted, fontSize: typography.fontSizes.sm, padding: spacing.sm }}>
                      No investigation notes recorded yet.
                    </div>
                  ) : (
                    activeIncident.notes.map((note) => (
                      <div
                        key={note.id}
                        style={{
                          padding: spacing.sm,
                          backgroundColor: colors.bgTertiary,
                          borderRadius: 6,
                          border: `1px solid ${colors.borderSubtle}`,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSizes.xs, color: colors.textMuted, marginBottom: 4 }}>
                          <span style={{ fontWeight: typography.fontWeights.bold, color: colors.accentOrange }}>
                            {note.authorEmail || 'SOC Analyst'}
                          </span>
                          <span>{formatDateTime(note.createdAt)}</span>
                        </div>
                        <div style={{ fontSize: typography.fontSizes.sm, color: colors.textPrimary }}>
                          {note.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleAddNote} style={{ display: 'flex', gap: spacing.sm }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      placeholder="Add an investigative note or finding..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                    />
                  </div>
                  <div style={{ alignSelf: 'flex-start', marginTop: 1 }}>
                    <Button type="submit" variant="primary" disabled={noteMutation.isPending || !newNote.trim()}>
                      {noteMutation.isPending ? 'Posting...' : 'Add Note'}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

