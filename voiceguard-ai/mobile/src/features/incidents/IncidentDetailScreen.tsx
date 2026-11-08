import React, { useState } from 'react';
import { useIncidentDetail } from './useIncidents';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Skeleton } from '../../components/common/Skeleton';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { formatRelativeTime } from '../../utils/formatters';

interface IncidentDetailScreenProps {
  incidentId: number;
  onBack: () => void;
  onNavigate: (screen: string, params?: Record<string, unknown>) => void;
}

export const IncidentDetailScreen: React.FC<IncidentDetailScreenProps> = ({
  incidentId,
  onBack,
  onNavigate,
}) => {
  const {
    incident,
    isLoading,
    isError,
    refetch,
    addNote,
    updateStatus,
    isAddingNote,
    isUpdatingStatus,
  } = useIncidentDetail(incidentId);

  const [noteContent, setNoteContent] = useState('');
  const [noteError, setNoteError] = useState('');

  if (isLoading) {
    return (
      <div style={{ padding: spacing.base, backgroundColor: colors.bgPrimary, minHeight: '100vh' }}>
        <Skeleton height={60} />
        <Skeleton height={140} />
      </div>
    );
  }

  if (isError || !incident) {
    return (
      <div style={{ backgroundColor: colors.bgPrimary, minHeight: '100vh' }}>
        <Header title="Incident Detail" showBack onBack={onBack} />
        <ErrorBanner message="Failed to load incident from backend." onRetry={refetch} />
      </div>
    );
  }

  const handleAddNote = async () => {
    if (!noteContent.trim()) {
      setNoteError('Please enter a note before submitting');
      return;
    }
    setNoteError('');
    await addNote(noteContent.trim());
    setNoteContent('');
  };

  const handleStatusChange = async (newStatus: string) => {
    await updateStatus(newStatus);
  };

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
        title={incident.incident_number}
        subtitle="Phase 21 Incident Dossier"
        showBack
        onBack={onBack}
      />

      <div style={{ padding: spacing.base }}>
        {/* Main Incident Overview */}
        <Card elevated style={{ marginBottom: spacing.base }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Badge severity={incident.severity} />
            <span style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
              Priority: {incident.priority.toUpperCase()} • Created: {formatRelativeTime(incident.created_at)}
            </span>
          </div>

          <h2 style={{ fontSize: typography.fontSizes.md, fontWeight: 'bold', margin: '0 0 6px 0' }}>
            {incident.title}
          </h2>

          <p style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary, lineHeight: 1.5, margin: 0 }}>
            {incident.summary}
          </p>

          <div
            style={{
              marginTop: spacing.md,
              padding: spacing.sm,
              backgroundColor: colors.bgSecondary,
              borderRadius: 6,
              fontSize: typography.fontSizes.xs,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Assigned: <strong>{incident.assigned_to || 'Unassigned'}</strong></span>
            <span>Category: <strong style={{ color: colors.accentOrange }}>{incident.category}</strong></span>
          </div>
        </Card>

        {/* Status Workflow Selector */}
        <div style={{ marginBottom: spacing.base }}>
          <h3 style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary, margin: `0 0 ${spacing.xs}px 0` }}>
            Investigation Status Workflow
          </h3>
          <Card>
            <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap' }}>
              {(['open', 'investigating', 'resolved', 'closed'] as const).map((st) => {
                const isActive = incident.status === st;
                return (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    disabled={isUpdatingStatus}
                    style={{
                      flex: 1,
                      minWidth: 70,
                      backgroundColor: isActive ? colors.accentOrange : colors.bgElevated,
                      color: isActive ? '#ffffff' : colors.textSecondary,
                      border: `1px solid ${isActive ? colors.accentOrange : colors.borderSubtle}`,
                      borderRadius: 6,
                      padding: `${spacing.xs}px 0`,
                      fontSize: typography.fontSizes.xs,
                      fontWeight: isActive ? 'bold' : 'normal',
                      cursor: 'pointer',
                    }}
                  >
                    {st.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Linked Telephony Session */}
        {incident.call_id && (
          <div style={{ marginBottom: spacing.base }}>
            <h3 style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary, margin: `0 0 ${spacing.xs}px 0` }}>
              Linked Telephony Attack Session
            </h3>
            <Card onClick={() => onNavigate('RiskExplanation', { callId: incident.call_id! })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: typography.fontSizes.sm, fontWeight: 'bold', color: colors.textPrimary }}>
                    Inspect Call #{incident.call_id} Acoustic Evidence
                  </div>
                  <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                    Deepfake voice synthesis signals & vocoder metrics
                  </div>
                </div>
                <span style={{ color: colors.accentOrange }}>→</span>
              </div>
            </Card>
          </div>
        )}

        {/* Investigation Notes Timeline */}
        <div style={{ marginBottom: spacing.base }}>
          <h3 style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary, margin: `0 0 ${spacing.xs}px 0` }}>
            Investigation Timeline & Notes ({incident.notes?.length || 0})
          </h3>
          <Card>
            {incident.notes && incident.notes.length > 0 ? (
              incident.notes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    paddingBottom: spacing.sm,
                    marginBottom: spacing.sm,
                    borderBottom: `1px solid ${colors.borderSubtle}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <strong style={{ fontSize: typography.fontSizes.xs, color: colors.accentOrange }}>
                      {note.author}
                    </strong>
                    <span style={{ fontSize: 10, color: colors.textMuted }}>
                      {formatRelativeTime(note.created_at)}
                    </span>
                  </div>
                  <p style={{ fontSize: typography.fontSizes.xs, color: colors.textPrimary, margin: 0, lineHeight: 1.4 }}>
                    {note.content}
                  </p>
                </div>
              ))
            ) : (
              <p style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted, margin: 0 }}>
                No notes logged yet.
              </p>
            )}

            {/* Add Note Form */}
            <div style={{ marginTop: spacing.sm }}>
              <Input
                placeholder="Add authorized investigation note..."
                value={noteContent}
                onChangeText={setNoteContent}
                multiline
                rows={2}
                error={noteError}
              />
              <Button
                size="sm"
                variant="primary"
                loading={isAddingNote}
                onClick={handleAddNote}
                style={{ width: '100%' }}
              >
                Log Investigation Note
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
