import React, { useState, useEffect } from 'react';
import { desktopApiClient } from '../../api/client';
import { DESKTOP_ENDPOINTS } from '../../api/endpoints';
import { NavigationSection } from '../../types';
import { colors } from '../../theme/colors';
import { spacing, typography } from '../../theme/tokens';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Skeleton, EmptyState } from '../../components/common/Feedback';

interface GlobalSearchViewProps {
  initialQuery?: string;
  onNavigate: (section: NavigationSection) => void;
  onSelectCall?: (callId: string) => void;
}

export const GlobalSearchView: React.FC<GlobalSearchViewProps> = ({
  initialQuery = '',
  onNavigate,
  onSelectCall,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<{
    calls: any[];
    alerts: any[];
    incidents: any[];
    threats: any[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setResults(null);
      return;
    }
    setIsLoading(true);
    try {
      const data = await desktopApiClient.get<any>(
        `${DESKTOP_ENDPOINTS.SEARCH}?q=${encodeURIComponent(searchTerm.trim())}`
      );
      setResults(data);
    } catch {
      setResults({ calls: [], alerts: [], incidents: [], threats: [] });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const totalHits = results
    ? (results.calls?.length || 0) +
      (results.alerts?.length || 0) +
      (results.incidents?.length || 0) +
      (results.threats?.length || 0)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: typography.fontSizes.xl, fontWeight: typography.fontWeights.bold, color: colors.textPrimary, margin: 0 }}>
          Global SOC Intelligence & Forensic Search
        </h2>
        <div style={{ fontSize: typography.fontSizes.sm, color: colors.textSecondary }}>
          Cross-entity indexed search across monitored calls, security alerts, incident triage cases, and threat indicators
        </div>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: spacing.sm, maxWidth: 700 }}>
        <div style={{ flex: 1 }}>
          <Input
            placeholder="Search phone numbers, IOCs, case IDs, synthetic tags, incident descriptions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div style={{ alignSelf: 'flex-start', marginTop: 1 }}>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? 'Searching...' : '🔍 Search'}
          </Button>
        </div>
      </form>

      {/* Results Area */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <Skeleton height={80} />
          <Skeleton height={80} />
        </div>
      ) : !results ? (
        <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.textMuted }}>
          Enter an entity identifier, phone number, or acoustic signature to initiate global SOC search.
        </div>
      ) : totalHits === 0 ? (
        <EmptyState
          title={`No results found for "${query}"`}
          description="Try broadening your search term or checking for typos."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
          {/* Matched Calls */}
          {results.calls && results.calls.length > 0 && (
            <Card title={`Matched Calls (${results.calls.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {results.calls.map((call) => (
                  <div
                    key={call.id}
                    onClick={() => {
                      if (onSelectCall) onSelectCall(call.id);
                      onNavigate('calls');
                    }}
                    style={{
                      padding: spacing.sm,
                      backgroundColor: colors.bgTertiary,
                      borderRadius: 6,
                      border: `1px solid ${colors.borderSubtle}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: typography.fontWeights.bold, color: colors.textPrimary }}>
                        {call.callerNumber} ➔ {call.recipientNumber}
                      </div>
                      <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                        Call ID: <code>{call.id}</code> • Status: {call.status}
                      </div>
                    </div>
                    <Badge variant={(call.riskScore ?? 0) >= 0.7 ? 'critical' : 'neutral'}>
                      Risk {((call.riskScore ?? 0) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Matched Incidents */}
          {results.incidents && results.incidents.length > 0 && (
            <Card title={`Matched Security Incidents (${results.incidents.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {results.incidents.map((inc) => (
                  <div
                    key={inc.id}
                    onClick={() => onNavigate('incidents')}
                    style={{
                      padding: spacing.sm,
                      backgroundColor: colors.bgTertiary,
                      borderRadius: 6,
                      border: `1px solid ${colors.borderSubtle}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: typography.fontWeights.bold, color: colors.textPrimary }}>
                        {inc.title}
                      </div>
                      <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                        Case: <code>{inc.id}</code> • {inc.description}
                      </div>
                    </div>
                    <Badge variant={inc.severity}>{inc.severity.toUpperCase()}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Matched Alerts */}
          {results.alerts && results.alerts.length > 0 && (
            <Card title={`Matched Alerts (${results.alerts.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {results.alerts.map((alt) => (
                  <div
                    key={alt.id}
                    onClick={() => onNavigate('alerts')}
                    style={{
                      padding: spacing.sm,
                      backgroundColor: colors.bgTertiary,
                      borderRadius: 6,
                      border: `1px solid ${colors.borderSubtle}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: typography.fontWeights.bold, color: colors.textPrimary }}>
                        {alt.title}
                      </div>
                      <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                        {alt.description}
                      </div>
                    </div>
                    <Badge variant={alt.severity}>{alt.severity.toUpperCase()}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Matched Threats */}
          {results.threats && results.threats.length > 0 && (
            <Card title={`Matched Threat Indicators (${results.threats.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                {results.threats.map((ioc) => (
                  <div
                    key={ioc.id}
                    onClick={() => onNavigate('threat-intelligence')}
                    style={{
                      padding: spacing.sm,
                      backgroundColor: colors.bgTertiary,
                      borderRadius: 6,
                      border: `1px solid ${colors.borderSubtle}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: typography.fontWeights.bold, color: colors.textPrimary }}>
                        {ioc.type.toUpperCase()}: <code>{ioc.value}</code>
                      </div>
                      <div style={{ fontSize: typography.fontSizes.xs, color: colors.textMuted }}>
                        {ioc.description || 'Known attack indicator'}
                      </div>
                    </div>
                    <Badge variant={ioc.severity}>{ioc.severity.toUpperCase()}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

