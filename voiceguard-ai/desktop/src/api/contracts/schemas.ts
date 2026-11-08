import { z } from 'zod';

export const LoginResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
});

export const UserProfileSchema = z.object({
  id: z.number(),
  name: z.string().nullable().optional(),
  email: z.string().email(),
  role_id: z.number().nullable().optional(),
  status: z.string(),
});

export const CallSessionSchema = z.object({
  id: z.number(),
  caller_number: z.string(),
  receiver_number: z.string(),
  started_at: z.string(),
  ended_at: z.string().nullable().optional(),
  status: z.string(),
  call_type: z.string().nullable().optional(),
  risk_level: z.string().nullable().optional(),
  origin: z.string().nullable().optional(),
  carrier: z.string().nullable().optional(),
  network_type: z.string().nullable().optional(),
  codec: z.string().nullable().optional(),
  voice_authenticity: z
    .object({
      score: z.number().nullable().optional(),
      confidence: z.number().nullable().optional(),
      model_name: z.string().nullable().optional(),
      model_version: z.string().nullable().optional(),
      features: z.record(z.unknown()).nullable().optional(),
    })
    .nullable()
    .optional(),
  speaker_verification: z
    .object({
      status: z.string().optional(),
      label: z.string().nullable().optional(),
      confidence: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  risk_score: z.number().nullable().optional(),
  active_alerts_count: z.number().optional().default(0),
});

export const RiskScoreSchema = z.object({
  id: z.number(),
  call_id: z.number(),
  caller_number: z.string(),
  target: z.string(),
  overall_score: z.number(),
  voice_score: z.number(),
  speaker_score: z.number(),
  caller_score: z.number(),
  device_score: z.number().optional().default(0),
  network_score: z.number().optional().default(0),
  conversation_score: z.number().optional().default(0),
  transaction_score: z.number().optional().default(0),
  threat_score: z.number().optional().default(0),
  confidence: z.number(),
  risk_level: z.string(),
  analysis_type: z.string().optional().default('synthetic_voice_detection'),
  synthetic_voice_score: z.number().optional().default(0),
  model_name: z.string().optional().default('VoiceGuard-Model'),
  model_version: z.string().optional().default('1.0'),
  created_at: z.string(),
});

export const RiskExplanationSchema = z.object({
  call_id: z.number(),
  overall_score: z.number(),
  risk_level: z.string(),
  confidence: z.number(),
  recommended_decision: z.string(),
  observed_evidence: z.array(z.string()),
  model_conclusions: z.array(z.string()),
  policy_decisions: z.array(z.string()),
  recommended_actions: z.array(z.string()),
  actions_executed: z.array(z.string()),
  contradictory_evidence: z.array(z.string()),
  missing_signals: z.array(z.string()),
  timestamp: z.string(),
});

export const AlertSchema = z.object({
  id: z.number(),
  call_id: z.number().nullable().optional(),
  alert_type: z.string(),
  severity: z.string(),
  title: z.string(),
  message: z.string(),
  status: z.string(),
  created_at: z.string(),
  resolved_at: z.string().nullable().optional(),
  caller_number: z.string().nullable().optional(),
  target: z.string().nullable().optional(),
  risk_score: z.number().nullable().optional(),
});

export const IncidentNoteSchema = z.object({
  id: z.number(),
  author: z.string(),
  content: z.string(),
  created_at: z.string(),
});

export const IncidentSchema = z.object({
  id: z.number(),
  incident_number: z.string(),
  title: z.string(),
  category: z.string(),
  severity: z.string(),
  priority: z.string(),
  status: z.string(),
  assigned_to: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  call_id: z.number().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  notes: z.array(IncidentNoteSchema).optional().default([]),
});

export const PreventionActionSchema = z.object({
  id: z.number(),
  call_id: z.number().nullable().optional(),
  action_type: z.string(),
  status: z.string(),
  reason: z.string().nullable().optional(),
  provider: z.string().default('internal'),
  policy_name: z.string().nullable().optional(),
  execution_result: z.record(z.unknown()).nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ThreatIndicatorSchema = z.object({
  id: z.number(),
  indicator_type: z.string(),
  indicator_value: z.string(),
  source: z.string(),
  reputation: z.string(),
  severity: z.string(),
  first_seen: z.string().nullable().optional(),
  last_seen: z.string().nullable().optional(),
  metadata_json: z.record(z.unknown()).nullable().optional(),
});

export const AuditLogSchema = z.object({
  id: z.number(),
  user_id: z.number().nullable().optional(),
  user_email: z.string().optional().default('system'),
  action: z.string(),
  resource_type: z.string(),
  resource_id: z.string().nullable().optional(),
  details: z.record(z.unknown()).nullable().optional(),
  ip_address: z.string().nullable().optional(),
  created_at: z.string(),
});

export const ServiceHealthSchema = z.object({
  name: z.string(),
  status: z.string(),
  latency_ms: z.number(),
  version: z.string(),
  details: z.string(),
  last_check: z.string(),
});

export const SystemHealthSchema = z.object({
  overall_status: z.string(),
  timestamp: z.string(),
  services: z.array(ServiceHealthSchema),
});

export const SearchResultItemSchema = z.object({
  category: z.enum(['call', 'alert', 'incident', 'threat_indicator']),
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  severity: z.string(),
  link_target: z.string(),
});

export const SearchResponseSchema = z.object({
  query: z.string(),
  total_results: z.number(),
  results: z.array(SearchResultItemSchema),
});

