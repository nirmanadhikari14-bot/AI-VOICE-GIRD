// VoiceGuard AI — Integration Layer API Client
// Phase 29: SIH26104

const API_BASE = '/api/v1/analysis';

export interface AnalysisRequestPayload {
  call_id?: number;
  audio_base64?: string;
  audio_session_id?: string;
  analysis_profile?: string;
  requested_features?: string[];
  idempotency_key?: string;
  consent_confirmed?: boolean;
  caller_number?: string;
  target_identity?: string;
  transaction_info?: Record<string, any>;
  context_overrides?: Record<string, any>;
}

export interface RiskScores {
  voice: number;
  speaker: number;
  caller: number;
  device: number;
  network: number;
  conversation: number;
  transaction: number;
  threat: number;
}

export interface RiskAssessment {
  overall_score: number;
  risk_level: string;
  confidence: number;
  is_incomplete?: boolean;
  recommended_decision?: string;
  scores?: RiskScores;
}

export interface ExplanationDossier {
  observed_evidence: string[];
  model_conclusions: string[];
  contradictory_evidence: string[];
  missing_signals: string[];
  policy_decisions: string[];
  recommended_actions: string[];
}

export interface UnifiedAnalysisResponse {
  analysis_id: string;
  correlation_id: string;
  organization_id?: number;
  processing_status: string;
  audio_status: string;
  authenticity_result?: Record<string, any>;
  speaker_verification_result?: Record<string, any>;
  prosody_result?: Record<string, any>;
  language_result?: Record<string, any>;
  transcription_result?: Record<string, any>;
  conversation_result?: Record<string, any>;
  threat_result?: Record<string, any>;
  caller_result?: Record<string, any>;
  risk_assessment?: RiskAssessment;
  explanation?: ExplanationDossier;
  alerts: Array<Record<string, any>>;
  prevention_actions: Array<Record<string, any>>;
  incidents: Array<Record<string, any>>;
  processing_metadata?: {
    total_processing_time_ms: number;
    module_latencies: Record<string, number>;
    failed_modules: string[];
    timed_out_modules: string[];
  };
  warnings: string[];
  error_code?: string;
  error_message?: string;
}

export interface AnalysisSessionSummary {
  analysis_id: string;
  correlation_id: string;
  organization_id?: number;
  status: string;
  created_at?: string;
  completed_at?: string;
  overall_risk_score?: number;
  risk_level?: string;
  error_code?: string;
  error_message?: string;
}

export interface IntegrationEventItem {
  id?: number;
  event_id: string;
  event_type: string;
  event_version: string;
  correlation_id: string;
  organization_id?: number;
  source_module: string;
  timestamp: string;
  payload_version: string;
  payload: Record<string, any>;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const integrationApi = {
  triggerAnalysis: async (payload: AnalysisRequestPayload): Promise<UnifiedAnalysisResponse> => {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Analysis execution failed');
    }
    return res.json();
  },

  listSessions: async (statusFilter?: string): Promise<AnalysisSessionSummary[]> => {
    const url = statusFilter ? `${API_BASE}?status=${encodeURIComponent(statusFilter)}` : API_BASE;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      throw new Error('Failed to fetch analysis sessions');
    }
    return res.json();
  },

  getResults: async (analysisId: string): Promise<UnifiedAnalysisResponse> => {
    const res = await fetch(`${API_BASE}/${analysisId}/results`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      throw new Error('Failed to fetch analysis results');
    }
    return res.json();
  },

  getStatus: async (analysisId: string): Promise<AnalysisSessionSummary> => {
    const res = await fetch(`${API_BASE}/${analysisId}/status`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      throw new Error('Failed to fetch analysis status');
    }
    return res.json();
  },

  cancelSession: async (analysisId: string): Promise<{ analysis_id: string; cancelled: boolean; status: string; message: string }> => {
    const res = await fetch(`${API_BASE}/${analysisId}/cancel`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      throw new Error('Failed to cancel session');
    }
    return res.json();
  },

  listEvents: async (limit = 50): Promise<IntegrationEventItem[]> => {
    const res = await fetch(`${API_BASE}/events?limit=${limit}`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      throw new Error('Failed to fetch integration events');
    }
    return res.json();
  },
};

