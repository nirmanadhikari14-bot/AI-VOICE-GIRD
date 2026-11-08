import { z } from 'zod';

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'none']);

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

export const VerificationSessionSchema = z.object({
  verification_id: z.number(),
  call_id: z.number().nullable().optional(),
  verification_type: z.string(),
  status: z.string().optional().default('pending'),
  instruction: z.string().optional(),
  result: z.string().optional(),
  confidence: z.number().optional().default(0),
  performed_by: z.string().optional().default('system'),
  created_at: z.string().optional(),
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

// Push notification payload schema (untrusted input validation)
export const PushNotificationPayloadSchema = z.object({
  type: z.enum([
    'voice_clone',
    'impersonation',
    'high_risk',
    'secondary_verification',
    'suspicious_transaction',
    'incident_assignment',
    'incident_status',
    'prevention_failure',
  ]),
  reference_id: z.union([z.number(), z.string()]),
  title: z.string().max(120),
  timestamp: z.string(),
  // Must NOT include sensitive data (OTP, credentials, full transcripts)
});
