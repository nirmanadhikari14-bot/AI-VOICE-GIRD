// VoiceGuard AI — AI Model Evaluation API Client
// Phase 27: SIH26104

export interface EvaluationDataset {
  id: number;
  dataset_id: string;
  name: string;
  version: string;
  description?: string;
  source?: string;
  license?: string;
  primary_language: string;
  languages_covered: string[];
  sample_count: number;
  total_duration_hours: number;
  validation_status: string;
  created_at: string;
}

export interface GateCheck {
  check_name: string;
  target_criteria: string;
  actual_value: string;
  passed: boolean;
  is_mandatory: boolean;
}

export interface ModelReadiness {
  id: number;
  model_id: string;
  model_version: string;
  evaluation_run_id?: string;
  readiness_status: string;
  target_tier: string;
  readiness_score_pct: number;
  passed_all_mandatory_gates: boolean;
  gate_checks_json: GateCheck[];
  missing_evidence: string[];
  approved_by?: string;
  approved_at?: string;
  audit_notes?: string;
  created_at: string;
}

export interface RobustnessResult {
  condition_id: string;
  condition_name: string;
  category: string;
  baseline_accuracy: number;
  degraded_accuracy: number;
  accuracy_drop: number;
  baseline_eer: number;
  degraded_eer: number;
  eer_degradation_ratio: number;
  is_resilient: boolean;
}

export interface FairnessSubgroup {
  subgroup_name: string;
  sample_count: number;
  accuracy: number;
  false_positive_rate: number;
  false_negative_rate: number;
  equal_error_rate: number;
  fpr_disparity_vs_baseline: number;
  fnr_disparity_vs_baseline: number;
  is_fair: boolean;
}

export interface FairnessAudit {
  baseline_subgroup: string;
  subgroups: FairnessSubgroup[];
  max_fpr_disparity_ratio: number;
  max_fnr_disparity_ratio: number;
  is_statistically_fair: boolean;
  disparity_threshold: number;
}

export interface ReliabilityBin {
  bin_index: number;
  bin_lower: number;
  bin_upper: number;
  sample_count: number;
  mean_confidence: number;
  observed_accuracy: number;
  calibration_error: number;
}

export interface CalibrationResult {
  expected_calibration_error: number;
  maximum_calibration_error: number;
  brier_score: number;
  reliability_bins: ReliabilityBin[];
  is_well_calibrated: boolean;
}

export interface EvaluationRun {
  id: number;
  evaluation_run_id: string;
  evaluation_name: string;
  model_id: string;
  model_version: string;
  model_type?: string;
  dataset_id: string;
  status: string;
  sample_count: number;
  metrics_json: Record<string, any>;
  latency_json: Record<string, any>;
  calibration_json?: CalibrationResult;
  fairness_json?: FairnessAudit;
  robustness_json: RobustnessResult[];
  readiness_status?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  total_duration_sec?: number;
  created_at: string;
}

export interface ModelSummary {
  model_id: string;
  model_name: string;
  model_version: string;
  model_type: string;
  latest_readiness_status?: string;
  latest_evaluation_run_id?: string;
  latest_accuracy?: number;
  latest_eer?: number;
  latest_auc?: number;
  latest_p95_latency_ms?: number;
  evaluation_count: number;
}

export interface ThresholdResult {
  id: number;
  model_id: string;
  model_version: string;
  threshold_name: string;
  threshold_value: number;
  eer_value?: number;
  roc_auc?: number;
  status: string;
  notes?: string;
  created_at: string;
}

export interface EvaluationHealth {
  status: string;
  total_evaluation_runs: number;
  completed_runs: number;
  failed_runs: number;
  total_datasets: number;
  models_evaluated: number;
  ai_engine_available: boolean;
  message: string;
}

const API_BASE = 'http://127.0.0.1:8000/api/v1/evaluations';

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

export const evaluationApi = {
  getHealth: () => request<EvaluationHealth>('/health'),
  getDatasets: () => request<EvaluationDataset[]>('/datasets'),
  createDataset: (data: Partial<EvaluationDataset>) =>
    request<EvaluationDataset>('/datasets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getEvaluations: (params?: { model_id?: string; status_filter?: string }) => {
    const q = new URLSearchParams();
    if (params?.model_id) q.set('model_id', params.model_id);
    if (params?.status_filter) q.set('status_filter', params.status_filter);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<EvaluationRun[]>(`/${qs}`);
  },
  getEvaluation: (id: string) => request<EvaluationRun>(`/${id}`),
  createEvaluation: (payload: {
    evaluation_name: string;
    model_id: string;
    model_version: string;
    dataset_id: string;
    run_robustness?: boolean;
    run_fairness?: boolean;
    run_calibration?: boolean;
    target_deployment_tier?: string;
  }) =>
    request<EvaluationRun>('/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listModels: () => request<any[]>('/models'),
  getModelHistory: (modelId: string) => request<EvaluationRun[]>(`/models/${modelId}/history`),
  compareModelVersions: (modelId: string) => request<any>(`/models/${modelId}/compare`),
  getReadinessRecords: () => request<ModelReadiness[]>('/readiness'),
  approveReadiness: (modelId: string, payload: { approved_by: string; target_tier?: string; audit_notes?: string }) =>
    request<ModelReadiness>(`/readiness/${modelId}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  runThresholdAnalysis: (payload: { model_id: string; model_version: string; target_fpr?: number }) =>
    request<ThresholdResult>('/threshold-analysis', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
