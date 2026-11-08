export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'none';
export type AlertSeverity = Severity;
export type AlertStatus = 'active' | 'acknowledged' | 'dismissed';

export type NavigationSection =
  | 'dashboard'
  | 'live-monitoring'
  | 'calls'
  | 'voice-forensics'
  | 'speaker-verification'
  | 'risk-analysis'
  | 'explainability'
  | 'alerts'
  | 'incidents'
  | 'prevention'
  | 'threat-intelligence'
  | 'search'
  | 'audit'
  | 'system-health'
  | 'settings';

export interface UserProfile {
  id: number;
  name?: string | null;
  email: string;
  role_id?: number | null;
  role?: string;
  status: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_at?: number;
}

export interface CallSessionData {
  id: string;
  caller_number?: string;
  callerNumber?: string;
  receiver_number?: string;
  recipientNumber?: string;
  started_at?: string;
  startedAt: string;
  ended_at?: string | null;
  endedAt?: string | null;
  duration_seconds?: number;
  durationSeconds?: number;
  status: string;
  direction: 'inbound' | 'outbound';
  call_type?: string | null;
  risk_level?: Severity;
  riskScore?: number;
  risk_score?: number | null;
  origin?: string | null;
  carrier?: string | null;
  network_type?: string | null;
  codec?: string | null;
  voice_authenticity?: {
    score: number | null;
    confidence: number | null;
    model_name: string | null;
    model_version: string | null;
    features: Record<string, unknown> | null;
  } | null;
  speaker_verification?: {
    status: string;
    label: string | null;
    confidence: number | null;
  } | null;
  active_alerts_count?: number;
}

export type CallSession = CallSessionData;

export interface RiskScoreData {
  id: number;
  call_id: number;
  caller_number: string;
  target: string;
  overall_score: number;
  voice_score: number;
  speaker_score: number;
  caller_score: number;
  device_score: number;
  network_score: number;
  conversation_score: number;
  transaction_score: number;
  threat_score: number;
  confidence: number;
  risk_level: Severity;
  analysis_type: string;
  synthetic_voice_score: number;
  model_name: string;
  model_version: string;
  created_at: string;
}

export interface RiskExplanationData {
  call_id: number;
  overall_score: number;
  risk_level: Severity;
  confidence: number;
  recommended_decision: string;
  observed_evidence: string[];
  model_conclusions: string[];
  policy_decisions: string[];
  recommended_actions: string[];
  actions_executed: string[];
  contradictory_evidence: string[];
  missing_signals: string[];
  timestamp: string;
}

export interface AlertData {
  id: string;
  call_id?: number | string | null;
  callId?: string | null;
  alert_type?: string;
  severity: Severity;
  title: string;
  message?: string;
  description?: string;
  status: 'active' | 'acknowledged' | 'dismissed';
  created_at?: string;
  createdAt: string;
  resolved_at?: string | null;
  caller_number?: string | null;
  target?: string | null;
  risk_score?: number | null;
}

export type SecurityAlert = AlertData;

export interface IncidentNoteData {
  id: string | number;
  author?: string;
  authorEmail?: string;
  content: string;
  created_at?: string;
  createdAt: string;
}

export type IncidentNote = IncidentNoteData;

export interface IncidentData {
  id: string;
  incident_number?: string;
  title: string;
  category?: string;
  severity: Severity;
  priority?: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  assigned_to?: string | null;
  assignedTo?: string | null;
  summary?: string | null;
  description?: string;
  call_id?: number | string | null;
  created_at?: string;
  createdAt: string;
  updated_at?: string;
  notes?: IncidentNoteData[];
}

export type SecurityIncident = IncidentData;

export interface PreventionActionData {
  id: string;
  call_id?: number | string | null;
  callId?: string | null;
  action_type?: string;
  actionType: string;
  target: string;
  status:
    | 'proposed'
    | 'pending_approval'
    | 'pending'
    | 'approved'
    | 'queued'
    | 'executing'
    | 'executed'
    | 'partially_executed'
    | 'failed'
    | 'rejected'
    | 'cancelled';
  reason?: string | null;
  provider?: string;
  policy_name?: string | null;
  execution_result?: Record<string, unknown> | null;
  created_at?: string;
  createdAt: string;
  updated_at?: string;
}

export type PreventionAction = PreventionActionData;

export interface ThreatIndicatorData {
  id: string;
  type: string;
  indicator_type?: string;
  value: string;
  indicator_value?: string;
  source?: string;
  reputation?: string;
  reputationScore?: number;
  severity: Severity;
  description?: string;
  first_seen?: string | null;
  last_seen?: string | null;
  created_at?: string;
  createdAt: string;
  metadata_json?: Record<string, unknown> | null;
}

export type ThreatIndicator = ThreatIndicatorData;

export interface AuditLogData {
  id: string;
  user_id?: number | null;
  userEmail?: string;
  user_email?: string;
  action: string;
  resource_type?: string;
  resource_id?: string | null;
  details?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
  ip_address?: string | null;
  created_at?: string;
  createdAt: string;
}

export type AuditLogEntry = AuditLogData;

export interface ServiceHealthItem {
  name: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  latency_ms: number;
  version: string;
  details: string;
  last_check: string;
}

export interface SystemHealthData {
  overall_status: string;
  timestamp: string;
  services: ServiceHealthItem[];
}

export interface SearchResultItem {
  category: 'call' | 'alert' | 'incident' | 'threat_indicator';
  id: string;
  title: string;
  subtitle: string;
  severity: Severity;
  link_target: string;
}
