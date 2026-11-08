export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface UserProfile {
  id: number;
  name?: string | null;
  email: string;
  role_id?: number | null;
  status: string;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_at?: number;
}

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
  id: number;
  call_id: number | null;
  alert_type: string;
  severity: Severity;
  title: string;
  message: string;
  status: 'active' | 'acknowledged' | 'dismissed';
  created_at: string;
  resolved_at: string | null;
  caller_number: string | null;
  target: string | null;
  risk_score: number | null;
}

export interface IncidentNoteData {
  id: number;
  author: string;
  content: string;
  created_at: string;
}

export interface IncidentData {
  id: number;
  incident_number: string;
  title: string;
  category: string;
  severity: Severity;
  priority: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  assigned_to: string | null;
  summary: string | null;
  call_id: number | null;
  created_at: string;
  updated_at: string;
  notes?: IncidentNoteData[];
}

export interface PreventionActionData {
  id: number;
  call_id: number | null;
  action_type: string;
  status:
    | 'proposed'
    | 'pending_approval'
    | 'approved'
    | 'queued'
    | 'executing'
    | 'executed'
    | 'partially_executed'
    | 'failed'
    | 'cancelled';
  reason: string | null;
  provider: string;
  policy_name: string | null;
  execution_result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationSessionData {
  verification_id: number;
  call_id: number | null;
  verification_type: string;
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  instruction?: string;
  confidence: number;
  performed_by: string;
  created_at: string;
}

export interface CallSessionData {
  id: number;
  caller_number: string;
  receiver_number: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  call_type: string | null;
  risk_level: Severity;
  origin: string | null;
  carrier: string | null;
  network_type: string | null;
  codec: string | null;
  voice_authenticity: {
    score: number | null;
    confidence: number | null;
    model_name: string | null;
    model_version: string | null;
    features: Record<string, unknown> | null;
  } | null;
  speaker_verification: {
    status: string;
    label: string | null;
    confidence: number | null;
  } | null;
  risk_score: number | null;
  active_alerts_count: number;
}

export interface SuspiciousReportData {
  interaction_type: 'call' | 'voice_note' | 'money_request' | 'otp_request' | 'impersonation';
  caller_info?: string;
  description: string;
  reason: string;
  evidence_url?: string;
}

export interface DeviceRegistrationData {
  device_token: string;
  platform: 'ios' | 'android' | 'web';
  device_name?: string;
  push_enabled: boolean;
}

export type RootTabParamList = {
  Home: undefined;
  Alerts: undefined;
  Security: undefined;
  Incidents: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  Login: undefined;
  AlertDetail: { alertId: number };
  RiskDetail: { callId: number };
  RiskExplanation: { callId: number };
  IncidentDetail: { incidentId: number };
  CreateIncident: undefined;
  PreventionActions: undefined;
  PreventionDetail: { actionId: number };
  SecondaryVerification: { callId?: number; targetIdentity?: string };
  ReportSuspicious: { callId?: number };
  CallDetail: { callId: number };
  Settings: undefined;
  NotificationSettings: undefined;
};
