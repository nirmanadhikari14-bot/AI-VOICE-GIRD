// VoiceGuard AI — Multilingual & Accent API Client
// Phase 26: SIH26104

export interface LanguageItem {
  code: string;
  name: string;
  native_name: string;
  native_script: string;
  transliteration_scripts: string[];
  supported_asr_models: string[];
  supported_lid_models: string[];
  status: string;
  min_confidence_threshold: number;
  enabled: boolean;
  code_switching_pairs: string[];
  notes?: string;
}

export interface AccentItem {
  accent_id: string;
  label: string;
  group: string;
  base_language: string;
  influence_language?: string;
  phonetic_markers: string[];
  prosody_profile: Record<string, string>;
  safety_notice: string;
}

export interface FairnessReport {
  audit_date: string;
  overall_fairness_rating: string;
  max_disparity_ratio: number;
  language_disparities: Array<{
    language_code: string;
    language_name: string;
    false_positive_rate: number;
    disparity_ratio_vs_english: number;
    is_statistically_fair: boolean;
    mitigation_applied: string;
  }>;
  accent_assessments: Array<{
    accent_id: string;
    accent_label: string;
    evaluated_samples: number;
    false_alarm_rate: number;
    bias_risk_rating: string;
    safeguard_verified: boolean;
  }>;
  safety_rule_enforcement_status: Record<string, boolean>;
  recommendations: string[];
}

export interface MultilingualHealth {
  status: string;
  total_languages_configured: number;
  supported_languages_count: number;
  total_accents_registered: number;
  active_lid_model: string;
  active_asr_model: string;
  fairness_guard_active: boolean;
  models_available: string[];
}

const API_BASE = 'http://127.0.0.1:8000/api/v1/multilingual';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // fallback
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export const multilingualApi = {
  getLanguages: () => request<LanguageItem[]>('/languages'),
  getAccents: () => request<AccentItem[]>('/accents'),
  getFairnessReport: () => request<FairnessReport>('/fairness-report'),
  getHealth: () => request<MultilingualHealth>('/health'),
  identifyLanguage: (payload: { audio_base64?: string; sample_rate?: number; context_hint?: string }) =>
    request<any>('/identify-language', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  transcribe: (payload: { audio_base64?: string; forced_language?: string; model_id?: string }) =>
    request<any>('/transcribe', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
