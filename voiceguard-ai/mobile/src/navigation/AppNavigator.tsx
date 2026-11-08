import React, { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { LoginScreen } from '../features/auth/LoginScreen';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { AlertListScreen } from '../features/alerts/AlertListScreen';
import { AlertDetailScreen } from '../features/alerts/AlertDetailScreen';
import { LiveSecurityScreen } from '../features/live-security/LiveSecurityScreen';
import { CallDetailScreen } from '../features/live-security/CallDetailScreen';
import { RiskExplanationScreen } from '../features/risk-assessment/RiskExplanationScreen';
import { IncidentListScreen } from '../features/incidents/IncidentListScreen';
import { IncidentDetailScreen } from '../features/incidents/IncidentDetailScreen';
import { CreateIncidentScreen } from '../features/incidents/CreateIncidentScreen';
import { PreventionActionsScreen } from '../features/prevention/PreventionActionsScreen';
import { SecondaryVerificationScreen } from '../features/verification/SecondaryVerificationScreen';
import { ReportSuspiciousScreen } from '../features/reports/ReportSuspiciousScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { ProfileScreen } from '../features/profile/ProfileScreen';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type TabName = 'Home' | 'Alerts' | 'Security' | 'Incidents' | 'Profile';

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabName>('Home');
  const [stackScreen, setStackScreen] = useState<{
    name: string;
    params?: Record<string, unknown>;
  } | null>(null);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: colors.bgPrimary,
          color: colors.accentOrange,
          fontSize: typography.fontSizes.base,
        }}
      >
        Initializing VoiceGuard AI Secure Vault...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const navigate = (screen: string, params?: Record<string, unknown>) => {
    if (['Home', 'Alerts', 'Security', 'Incidents', 'Profile'].includes(screen)) {
      setCurrentTab(screen as TabName);
      setStackScreen(null);
    } else {
      setStackScreen({ name: screen, params });
    }
  };

  const goBack = () => {
    setStackScreen(null);
  };

  // Render detail / stack screens if pushed
  if (stackScreen) {
    switch (stackScreen.name) {
      case 'AlertDetail':
        return (
          <AlertDetailScreen
            alertId={stackScreen.params?.alertId as number}
            onBack={goBack}
            onNavigate={navigate}
          />
        );
      case 'RiskExplanation':
        return (
          <RiskExplanationScreen
            callId={stackScreen.params?.callId as number}
            onBack={goBack}
            onNavigate={navigate}
          />
        );
      case 'CallDetail':
        return (
          <CallDetailScreen
            callId={stackScreen.params?.callId as number}
            onBack={goBack}
            onNavigate={navigate}
          />
        );
      case 'IncidentDetail':
        return (
          <IncidentDetailScreen
            incidentId={stackScreen.params?.incidentId as number}
            onBack={goBack}
            onNavigate={navigate}
          />
        );
      case 'CreateIncident':
        return (
          <CreateIncidentScreen
            onBack={goBack}
            onSuccess={(incId) => navigate('IncidentDetail', { incidentId: incId })}
          />
        );
      case 'PreventionActions':
        return <PreventionActionsScreen onBack={goBack} onNavigate={navigate} />;
      case 'SecondaryVerification':
        return (
          <SecondaryVerificationScreen
            callId={stackScreen.params?.callId as number | undefined}
            targetIdentity={stackScreen.params?.targetIdentity as string | undefined}
            onBack={goBack}
            onSuccess={() => navigate('Incidents')}
          />
        );
      case 'ReportSuspicious':
        return (
          <ReportSuspiciousScreen
            callId={stackScreen.params?.callId as number | undefined}
            onBack={goBack}
            onSuccess={(incNum) => navigate('Incidents')}
          />
        );
      case 'Settings':
        return <SettingsScreen onBack={goBack} onNavigate={navigate} />;
      default:
        break;
    }
  }

  // Bottom Navigation tabs
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: colors.bgPrimary }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {currentTab === 'Home' && <DashboardScreen onNavigate={navigate} />}
        {currentTab === 'Alerts' && <AlertListScreen onNavigate={navigate} />}
        {currentTab === 'Security' && <LiveSecurityScreen onNavigate={navigate} />}
        {currentTab === 'Incidents' && <IncidentListScreen onNavigate={navigate} />}
        {currentTab === 'Profile' && <ProfileScreen onNavigate={navigate} />}
      </div>

      {/* Bottom Bar */}
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          backgroundColor: colors.bgSecondary,
          borderTop: `1px solid ${colors.borderSubtle}`,
          padding: `${spacing.xs}px 0`,
          height: 56,
        }}
        aria-label="Main Navigation"
      >
        {(
          [
            { name: 'Home', icon: '🏠', label: 'Home' },
            { name: 'Alerts', icon: '🚨', label: 'Alerts' },
            { name: 'Security', icon: '📡', label: 'Security' },
            { name: 'Incidents', icon: '📋', label: 'Incidents' },
            { name: 'Profile', icon: '👤', label: 'Profile' },
          ] as const
        ).map((tab) => {
          const isActive = currentTab === tab.name;
          return (
            <button
              key={tab.name}
              onClick={() => {
                setCurrentTab(tab.name);
                setStackScreen(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                color: isActive ? colors.accentOrange : colors.textMuted,
                cursor: 'pointer',
                padding: spacing.xxs,
                minWidth: 50,
              }}
              aria-selected={isActive}
            >
              <span style={{ fontSize: 18 }}>{tab.icon}</span>
              <span
                style={{
                  fontSize: 10,
                  marginTop: 2,
                  fontWeight: isActive ? 'bold' : 'normal',
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
