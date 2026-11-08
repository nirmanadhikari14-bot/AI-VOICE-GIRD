import React, { useState } from 'react';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { apiClient } from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import { validateReportInput } from '../../utils/validation';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface ReportSuspiciousScreenProps {
  callId?: number;
  onBack: () => void;
  onSuccess: (incidentNumber: string) => void;
}

export const ReportSuspiciousScreen: React.FC<ReportSuspiciousScreenProps> = ({
  callId,
  onBack,
  onSuccess,
}) => {
  const [interactionType, setInteractionType] = useState('call');
  const [callerInfo, setCallerInfo] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const val = validateReportInput({
      interaction_type: interactionType,
      description,
      reason,
    });

    if (!consentAcknowledged) {
      val.errors.consent = 'You must acknowledge the security telemetry consent statement';
    }

    if (!val.valid || !consentAcknowledged) {
      setErrors(val.errors);
      return;
    }

    setErrors({});
    setApiError(null);
    setIsSubmitting(true);

    try {
      const response = await apiClient.post<{ report_id: number; incident_number: string }>(
        ENDPOINTS.REPORT_SUSPICIOUS,
        {
          interaction_type: interactionType,
          caller_info: callerInfo || undefined,
          reason,
          description,
        }
      );

      onSuccess(response.incident_number);
    } catch (err: any) {
      setApiError(err?.message || 'Failed to submit suspicious call report');
    } finally {
      setIsSubmitting(false);
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
      <Header
        title="Report Suspicious Call"
        subtitle="Voice Cloning & Social Engineering Alert"
        showBack
        onBack={onBack}
      />

      <div style={{ padding: spacing.base }}>
        <Card elevated>
          {apiError && (
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
              {apiError}
            </div>
          )}

          <div style={{ marginBottom: spacing.base }}>
            <label
              style={{
                display: 'block',
                marginBottom: spacing.xs,
                fontSize: typography.fontSizes.sm,
                color: colors.textSecondary,
              }}
            >
              Interaction Type
            </label>
            <select
              value={interactionType}
              onChange={(e) => setInteractionType(e.target.value)}
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
              <option value="call">Suspicious Inbound Phone Call</option>
              <option value="voice_note">Suspicious Audio / Voice Note</option>
              <option value="money_request">Urgent Funds / Wire Request</option>
              <option value="otp_request">Request for 2FA / OTP Code</option>
              <option value="impersonation">Claiming to be Executive / Family Member</option>
            </select>
          </div>

          <Input
            label="Caller / Sender Information"
            placeholder="e.g. +1 (555) 019-2834 or 'Unknown VoIP'"
            value={callerInfo}
            onChangeText={setCallerInfo}
          />

          <Input
            label="Primary Reason for Suspicion"
            placeholder="e.g. Synthetic cadence, unusual urgency, unexpected money request"
            value={reason}
            onChangeText={setReason}
            error={errors.reason}
          />

          <Input
            label="Interaction Narrative & Details"
            placeholder="Explain what the caller stated and why their voice or request seemed unusual..."
            value={description}
            onChangeText={setDescription}
            multiline
            rows={4}
            error={errors.description}
          />

          {/* Privacy & Consent Acknowledgment */}
          <div
            style={{
              padding: spacing.sm,
              backgroundColor: colors.bgSecondary,
              borderRadius: 6,
              marginBottom: spacing.base,
              border: `1px solid ${errors.consent ? colors.danger : colors.borderSubtle}`,
            }}
          >
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.xs, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={consentAcknowledged}
                onChange={(e) => setConsentAcknowledged(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <span style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary, lineHeight: 1.4 }}>
                I acknowledge that this report will be securely reviewed by enterprise security analysts to
                investigate synthetic voice threats. No private call recordings will be shared outside the security perimeter.
              </span>
            </label>
            {errors.consent && (
              <span style={{ display: 'block', marginTop: 4, color: colors.danger, fontSize: 11 }}>
                {errors.consent}
              </span>
            )}
          </div>

          <Button
            variant="primary"
            loading={isSubmitting}
            onClick={handleSubmit}
            style={{ width: '100%' }}
          >
            Submit Threat Report
          </Button>
        </Card>
      </div>
    </div>
  );
};
