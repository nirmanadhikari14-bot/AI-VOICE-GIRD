import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './providers/AuthProvider';
import { NavigationSection, SecurityAlert, SecurityIncident } from '../types';
import { desktopApiClient } from '../api/client';
import { DESKTOP_ENDPOINTS } from '../api/endpoints';
import { colors } from '../theme/colors';
import { spacing } from '../theme/tokens';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';

// Feature Views
import { LoginView } from '../features/auth/LoginView';
import { DashboardView } from '../features/dashboard/DashboardView';
import { LiveMonitoringView } from '../features/live-monitoring/LiveMonitoringView';
import { CallInvestigationView } from '../features/calls/CallInvestigationView';
import { VoiceForensicsView } from '../features/voice-forensics/VoiceForensicsView';
import { SpeakerVerificationView } from '../features/speaker-verification/SpeakerVerificationView';
import { RiskAnalysisView } from '../features/risk-engine/RiskAnalysisView';
import { ExplainabilityView } from '../features/explainability/ExplainabilityView';
import { AlertManagementView } from '../features/alerts/AlertManagementView';
import { IncidentCenterView } from '../features/incidents/IncidentCenterView';
import { PreventionMonitoringView } from '../features/prevention/PreventionMonitoringView';
import { ThreatIntelligenceView } from '../features/threat-intelligence/ThreatIntelligenceView';
import { GlobalSearchView } from '../features/search/GlobalSearchView';
import { AuditLogsView } from '../features/audit/AuditLogsView';
import { SystemHealthView } from '../features/system-health/SystemHealthView';
import { ConsoleSettingsView } from '../features/settings/ConsoleSettingsView';

export const App: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [currentSection, setCurrentSection] = useState<NavigationSection>('dashboard');
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'polling' | 'offline'>('polling');

  // Query unread / active alerts for badge
  const { data: alerts = [] } = useQuery<SecurityAlert[]>({
    queryKey: ['alerts', 'badge'],
    queryFn: async () => {
      try {
        const res = await desktopApiClient.get<any>(DESKTOP_ENDPOINTS.ALERTS);
        setConnectionStatus('polling');
        return Array.isArray(res) ? res : res.items || [];
      } catch {
        setConnectionStatus('offline');
        return [];
      }
    },
    enabled: isAuthenticated,
    refetchInterval: 8000,
  });

  // Query open incidents for badge
  const { data: incidents = [] } = useQuery<SecurityIncident[]>({
    queryKey: ['incidents', 'badge'],
    queryFn: async () => {
      try {
        const res = await desktopApiClient.get<any>(DESKTOP_ENDPOINTS.INCIDENTS);
        return Array.isArray(res) ? res : res.items || [];
      } catch {
        return [];
      }
    },
    enabled: isAuthenticated,
    refetchInterval: 8000,
  });

  const activeAlertCount = alerts.filter((a) => a.status === 'active').length;
  const openIncidentCount = incidents.filter((i) => i.status !== 'closed' && i.status !== 'resolved').length;

  const handleSearchSubmit = (q: string) => {
    setSearchQuery(q);
    setCurrentSection('search');
  };

  if (authLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: colors.bgPrimary,
          color: colors.textSecondary,
        }}
      >
        Initializing VoiceGuard AI Desktop Console...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const renderActiveSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return (
          <DashboardView
            onNavigate={setCurrentSection}
            onSelectCall={(id) => {
              setSelectedCallId(id);
              setCurrentSection('calls');
            }}
          />
        );
      case 'live-monitoring':
        return (
          <LiveMonitoringView
            onNavigate={setCurrentSection}
            onSelectCall={(id) => {
              setSelectedCallId(id);
              setCurrentSection('calls');
            }}
          />
        );
      case 'calls':
        return (
          <CallInvestigationView
            selectedCallId={selectedCallId}
            onSelectCall={setSelectedCallId}
            onNavigate={setCurrentSection}
          />
        );
      case 'voice-forensics':
        return <VoiceForensicsView />;
      case 'speaker-verification':
        return <SpeakerVerificationView />;
      case 'risk-analysis':
        return <RiskAnalysisView />;
      case 'explainability':
        return <ExplainabilityView />;
      case 'alerts':
        return <AlertManagementView />;
      case 'incidents':
        return <IncidentCenterView />;
      case 'prevention':
        return <PreventionMonitoringView />;
      case 'threat-intelligence':
        return <ThreatIntelligenceView />;
      case 'search':
        return (
          <GlobalSearchView
            initialQuery={searchQuery}
            onNavigate={setCurrentSection}
            onSelectCall={(id) => {
              setSelectedCallId(id);
              setCurrentSection('calls');
            }}
          />
        );
      case 'audit':
        return <AuditLogsView />;
      case 'system-health':
        return <SystemHealthView />;
      case 'settings':
        return <ConsoleSettingsView />;
      default:
        return (
          <DashboardView
            onNavigate={setCurrentSection}
            onSelectCall={(id) => {
              setSelectedCallId(id);
              setCurrentSection('calls');
            }}
          />
        );
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: colors.bgPrimary,
        fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
      }}
    >
      {/* Sidebar Navigation */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={setCurrentSection}
        activeAlertCount={activeAlertCount}
        openIncidentCount={openIncidentCount}
      />

      {/* Main Container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Topbar with quick search and status */}
        <Topbar
          analystEmail={user?.email || 'security@voiceguard.ai'}
          analystRole={user?.role?.toUpperCase() || 'SOC ANALYST'}
          connectionStatus={connectionStatus}
          onSearchSubmit={handleSearchSubmit}
          onRefresh={() => {
            // trigger refetch by setting section to same or triggering query refresh
          }}
        />

        {/* Scrollable View Body */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: spacing.lg,
          }}
        >
          {renderActiveSection()}
        </main>
      </div>
    </div>
  );
};

