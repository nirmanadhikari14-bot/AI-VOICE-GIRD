import React from 'react';
import { NavigationSection } from '../../types';
import { colors } from '../../theme/colors';
import { spacing, typography, tokens } from '../../theme/tokens';

interface SidebarProps {
  currentSection: NavigationSection;
  onSelectSection: (section: NavigationSection) => void;
  activeAlertCount?: number;
  openIncidentCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  activeAlertCount = 0,
  openIncidentCount = 0,
}) => {
  const groups = [
    {
      title: 'OPERATIONS',
      items: [
        { id: 'dashboard', label: 'Security Dashboard', icon: '📊' },
        { id: 'live-monitoring', label: 'Live Monitoring', icon: '📡' },
        { id: 'calls', label: 'Call Investigations', icon: '📞' },
        { id: 'alerts', label: 'Alert Center', icon: '🚨', badge: activeAlertCount },
        { id: 'incidents', label: 'Incidents & Triage', icon: '📋', badge: openIncidentCount },
        { id: 'prevention', label: 'Prevention Actions', icon: '🛡️' },
      ],
    },
    {
      title: 'AI & FORENSICS',
      items: [
        { id: 'voice-forensics', label: 'Voice Forensics', icon: '🔬' },
        { id: 'speaker-verification', label: 'Speaker Verification', icon: '👤' },
        { id: 'risk-analysis', label: 'Risk Analysis (P17)', icon: '⚡' },
        { id: 'explainability', label: 'Explainable AI (P18)', icon: '💡' },
      ],
    },
    {
      title: 'INTELLIGENCE & AUDIT',
      items: [
        { id: 'threat-intelligence', label: 'Threat Intel (P16)', icon: '🌐' },
        { id: 'search', label: 'Global Search', icon: '🔍' },
        { id: 'audit', label: 'Audit Trail', icon: '📜' },
        { id: 'system-health', label: 'System Health', icon: '🩺' },
      ],
    },
    {
      title: 'CONFIGURATION',
      items: [
        { id: 'settings', label: 'Console Settings', icon: '⚙️' },
      ],
    },
  ];

  return (
    <aside
      style={{
        width: 250,
        backgroundColor: colors.bgSecondary,
        borderRight: `1px solid ${colors.borderSubtle}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        userSelect: 'none',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: `${spacing.base}px ${spacing.base}px`,
          borderBottom: `1px solid ${colors.borderSubtle}`,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: colors.accentOrange,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
        >
          🛡️
        </div>
        <div>
          <div
            style={{
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
              color: colors.textPrimary,
              letterSpacing: 0.5,
            }}
          >
            VoiceGuard AI
          </div>
          <div style={{ fontSize: 10, color: colors.textMuted, letterSpacing: 0.8 }}>
            WINDOWS SECURITY CONSOLE
          </div>
        </div>
      </div>

      {/* Nav List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `${spacing.sm}px 0` }}>
        {groups.map((grp) => (
          <div key={grp.title} style={{ marginBottom: spacing.sm }}>
            <div
              style={{
                padding: `4px ${spacing.base}px`,
                fontSize: 10,
                fontWeight: typography.fontWeights.bold,
                color: colors.textMuted,
                letterSpacing: 1,
              }}
            >
              {grp.title}
            </div>

            {grp.items.map((item) => {
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectSection(item.id as NavigationSection)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: `7px ${spacing.base}px`,
                    backgroundColor: isActive ? 'rgba(249, 115, 22, 0.12)' : 'transparent',
                    borderLeft: `3px solid ${isActive ? colors.accentOrange : 'transparent'}`,
                    borderTop: 'none',
                    borderRight: 'none',
                    borderBottom: 'none',
                    color: isActive ? colors.accentOrange : colors.textSecondary,
                    fontSize: typography.fontSizes.xs,
                    fontWeight: isActive ? typography.fontWeights.bold : typography.fontWeights.medium,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = colors.bgElevated;
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: 10,
                        backgroundColor: colors.threatCritical,
                        color: '#ffffff',
                        fontSize: 10,
                        fontWeight: 'bold',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div
        style={{
          padding: `${spacing.xs}px ${spacing.base}px`,
          borderTop: `1px solid ${colors.borderSubtle}`,
          fontSize: 11,
          color: colors.textMuted,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>v1.0.0 (Win64)</span>
        <span style={{ color: colors.accentGreen }}>● SOC Online</span>
      </div>
    </aside>
  );
};

