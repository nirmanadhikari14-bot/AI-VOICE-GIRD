// Shared types for VoiceGuard AI frontend

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'none'

export interface Call {
  id: string
  callId: string
  caller: string
  target: string
  status: 'active' | 'monitoring' | 'flagged' | 'ended'
  duration: number  // seconds
  riskScore: number // 0-100
  severity: Severity
  startedAt: string
  transcriptSnippet?: string
}

export interface ThreatEvent {
  id: string
  type: 'voice_clone' | 'impersonation' | 'anomaly' | 'pattern_match'
  severity: Severity
  callId: string
  caller: string
  timestamp: string
  description: string
  confidence: number // 0-100
  mitigated: boolean
}

export interface Speaker {
  id: string
  name: string
  organization?: string
  profileType: 'trusted' | 'suspect' | 'unknown'
  callCount: number
  lastSeen: string
  riskScore: number
}

export interface SystemMetric {
  label: string
  value: number
  unit?: string
  delta?: number
  trend: 'up' | 'down' | 'stable'
}

export interface AudioChunk {
  timestamp: number
  amplitude: number
  frequency?: number
}
