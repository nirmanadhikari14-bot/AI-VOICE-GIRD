import React, { useState } from 'react';
import { useSecondaryVerification } from './useVerification';
import { Header } from '../../components/common/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface SecondaryVerificationScreenProps {
  callId?: number;
  targetIdentity?: string;
  onBack: () => void;
  onSuccess?: () => void;
}

export const SecondaryVerificationScreen: React.FC<SecondaryVerificationScreenProps> = ({
  callId,
  targetIdentity = 'Corporate Treasury Desk',
  onBack,
  onSuccess,
}) => {
  const { requestVerification, submitVerificationDecision, isRequesting, isVerifying, session } =
    useSecondaryVerification();

  const [identityInput, setIdentityInput] = useState(targetIdentity);
  const [method, setMethod] = useState('out_of_band_prompt');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartWorkflow = async () => {
    try {
      setErrorMessage(null);
      await requestVerification({
        call_id: callId,
        target_identity: identityInput,
        verification_type: method,
      });
      setStatusMessage('Prompt dispatched via verified enterprise channel. Awaiting challenge response...');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to dispatch verification challenge');
    }
  };

  const handleDecision = async (decision: 'confirmed' | 'failed') => {
    if (!session?.verification_id) return;
    try {
      setErrorMessage(null);
      await submitVerificationDecision({
        verification_id: session.verification_id,
        decision,
      });
      setStatusMessage(
        decision === 'confirmed'
          ? 'Identity confirmed. Gatekeeper authorization granted.'
          : 'Verification rejected. Caller flagged as impersonation attack.'
      );
      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit verification decision');
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
        title="Secondary Verification"
        subtitle="Out-of-Band Identity Challenge"
        showBack
        onBack={onBack}
      />

      <div style={{ padding: spacing.base }}>
        <Card elevated style={{ marginBottom: spacing.base }}>
          <h2 style={{ fontSize: typography.fontSizes.base, fontWeight: 'bold', margin: '0 0 6px 0' }}>
            Why is verification required?
          </h2>
          <p style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary, lineHeight: 1.4, margin: 0 }}>
            Real-time acoustic analysis detected synthetic speech anomalies or speaker mismatch. In
            accordance with zero-trust fraud policy, sensitive financial operations must be validated
            through an independent, pre-enrolled identity channel.
          </p>
        </Card>

        {errorMessage && (
          <div
            style={{
              padding: spacing.sm,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: colors.danger,
              borderRadius: 6,
              marginBottom: spacing.base,
              fontSize: typography.fontSizes.xs,
            }}
          >
            {errorMessage}
          </div>
        )}

        {statusMessage && (
          <div
            style={{
              padding: spacing.sm,
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: colors.accentGreen,
              borderRadius: 6,
              marginBottom: spacing.base,
              fontSize: typography.fontSizes.xs,
            }}
          >
            {statusMessage}
          </div>
        )}

        {!session ? (
          <Card>
            <Input
              label="Pre-Enrolled Corporate Identity"
              value={identityInput}
              onChangeText={setIdentityInput}
              placeholder="e.g. employee.name@voiceguard.ai"
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
                Verification Channel
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
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
                <option value="out_of_band_prompt">Pre-Enrolled Trusted Mobile Push</option>
                <option value="corporate_email_challenge">Enterprise Email Secure Token</option>
                <option value="hardware_fido2">Hardware Security Key Prompt</option>
              </select>
            </div>

            <Button
              variant="primary"
              loading={isRequesting}
              onClick={handleStartWorkflow}
              style={{ width: '100%' }}
            >
              Dispatch Challenge
            </Button>
          </Card>
        ) : (
          <Card>
            <div style={{ textAlign: 'center', padding: spacing.md }}>
              <div style={{ fontSize: 36, marginBottom: spacing.xs }}>📲</div>
              <h3 style={{ fontSize: typography.fontSizes.sm, fontWeight: 'bold', margin: '0 0 4px 0' }}>
                Challenge Active (#{session.verification_id})
              </h3>
              <p style={{ fontSize: typography.fontSizes.xs, color: colors.textSecondary, margin: '0 0 16px 0' }}>
                {session.instruction || 'Challenge sent. Waiting for subject response.'}
              </p>

              <div style={{ display: 'flex', gap: spacing.sm }}>
                <Button
                  variant="primary"
                  loading={isVerifying}
                  onClick={() => handleDecision('confirmed')}
                  style={{ flex: 1, backgroundColor: colors.accentGreen }}
                >
                  ✓ Confirm Authentic
                </Button>
                <Button
                  variant="danger"
                  loading={isVerifying}
                  onClick={() => handleDecision('failed')}
                  style={{ flex: 1 }}
                >
                  ✕ Reject / Impersonator
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
