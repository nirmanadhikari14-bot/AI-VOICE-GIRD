import React, { useState } from 'react';
import { useIncidents } from './useIncidents';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface CreateIncidentScreenProps {
  onBack: () => void;
  onSuccess: (incidentId: number) => void;
}

export const CreateIncidentScreen: React.FC<CreateIncidentScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const { createIncident, isCreating } = useIncidents();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('voice_clone');
  const [severity, setSeverity] = useState('high');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title.trim() || !summary.trim()) {
      setError('Title and summary are required to open an incident');
      return;
    }

    try {
      setError('');
      const created = await createIncident({
        title: title.trim(),
        category,
        severity,
        summary: summary.trim(),
      });
      onSuccess(created.id);
    } catch (err: any) {
      setError(err?.message || 'Failed to open incident');
    }
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
      <Header title="Open Incident" subtitle="Register Security Case" showBack onBack={onBack} />

      <div style={{ padding: spacing.base }}>
        <Card elevated>
          {error && (
            <div
              style={{
                padding: spacing.xs,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: colors.danger,
                fontSize: typography.fontSizes.xs,
                borderRadius: 4,
                marginBottom: spacing.sm,
              }}
            >
              {error}
            </div>
          )}

          <Input
            label="Incident Title"
            placeholder="e.g. Impersonation Call on Financial Desk"
            value={title}
            onChangeText={setTitle}
          />

          <div style={{ marginBottom: spacing.base }}>
            <label
              style={{
                display: 'block',
                marginBottom: spacing.xs,
                fontSize: typography.fontSizes.sm,
                color: colors.textSecondary,
              }}
            >
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: colors.bgSecondary,
                border: `1px solid ${colors.borderDefault}`,
                color: colors.textPrimary,
                borderRadius: 6,
                padding: spacing.sm,
                fontSize: typography.fontSizes.sm,
              }}
            >
              <option value="voice_clone">Synthetic Voice Clone</option>
              <option value="impersonation">Executive Impersonation</option>
              <option value="telephony_spoof">Caller ID Spoofing</option>
              <option value="credential_phishing">Credential / OTP Harvester</option>
            </select>
          </div>

          <div style={{ marginBottom: spacing.base }}>
            <label
              style={{
                display: 'block',
                marginBottom: spacing.xs,
                fontSize: typography.fontSizes.sm,
                color: colors.textSecondary,
              }}
            >
              Initial Severity
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: colors.bgSecondary,
                border: `1px solid ${colors.borderDefault}`,
                color: colors.textPrimary,
                borderRadius: 6,
                padding: spacing.sm,
                fontSize: typography.fontSizes.sm,
              }}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <Input
            label="Case Summary & Context"
            placeholder="Detail the timeline, caller claims, and affected personnel..."
            value={summary}
            onChangeText={setSummary}
            multiline
            rows={4}
          />

          <Button
            variant="primary"
            loading={isCreating}
            onClick={handleSubmit}
            style={{ width: '100%', marginTop: spacing.sm }}
          >
            Create Incident Dossier
          </Button>
        </Card>
      </div>
    </div>
  );
};
