import type { Call, ThreatEvent, Speaker, SystemMetric } from '../types'

// ─── Mock Active Calls ───────────────────────────────────────
export const mockCalls: Call[] = [
  {
    id: '1', callId: 'CALL-0x1A3F', caller: '+1 (555) 847-2901', target: 'Citibank Fraud Dept',
    status: 'flagged', duration: 312, riskScore: 94, severity: 'critical',
    startedAt: new Date(Date.now() - 312000).toISOString(),
    transcriptSnippet: '"...please verify your SSN and account number to proceed with the refund..."',
  },
  {
    id: '2', callId: 'CALL-0x2B7C', caller: '+44 20 7946 0958', target: 'HSBC Support',
    status: 'active', duration: 87, riskScore: 72, severity: 'high',
    startedAt: new Date(Date.now() - 87000).toISOString(),
    transcriptSnippet: '"...I am calling from the Microsoft security team regarding your account..."',
  },
  {
    id: '3', callId: 'CALL-0x3C1D', caller: '+1 (800) 123-4567', target: 'Chase Bank',
    status: 'monitoring', duration: 45, riskScore: 38, severity: 'medium',
    startedAt: new Date(Date.now() - 45000).toISOString(),
    transcriptSnippet: '"...can you confirm the last four digits of your card..."',
  },
  {
    id: '4', callId: 'CALL-0x4D2E', caller: '+61 2 9374 4000', target: 'ANZ Bank',
    status: 'active', duration: 198, riskScore: 12, severity: 'low',
    startedAt: new Date(Date.now() - 198000).toISOString(),
  },
  {
    id: '5', callId: 'CALL-0x5E9A', caller: '+1 (555) 233-7812', target: 'Wells Fargo',
    status: 'monitoring', duration: 523, riskScore: 55, severity: 'medium',
    startedAt: new Date(Date.now() - 523000).toISOString(),
  },
]

// ─── Mock Threat Events ──────────────────────────────────────
export const mockThreats: ThreatEvent[] = [
  {
    id: 't1', type: 'voice_clone', severity: 'critical',
    callId: 'CALL-0x1A3F', caller: '+1 (555) 847-2901',
    timestamp: new Date(Date.now() - 60000).toISOString(),
    description: 'AI-synthesized voice detected with 97% confidence. Voice signature matches known threat actor DB-774.',
    confidence: 97, mitigated: false,
  },
  {
    id: 't2', type: 'impersonation', severity: 'high',
    callId: 'CALL-0x2B7C', caller: '+44 20 7946 0958',
    timestamp: new Date(Date.now() - 240000).toISOString(),
    description: 'Caller claiming to be Microsoft Support; number routes to offshore VoIP provider.',
    confidence: 84, mitigated: false,
  },
  {
    id: 't3', type: 'pattern_match', severity: 'high',
    callId: 'CALL-0x5E9A', caller: '+1 (555) 233-7812',
    timestamp: new Date(Date.now() - 480000).toISOString(),
    description: 'Social engineering script detected: urgency phrasing pattern matches 23 prior fraud cases.',
    confidence: 78, mitigated: true,
  },
  {
    id: 't4', type: 'anomaly', severity: 'medium',
    callId: 'CALL-0x3C1D', caller: '+1 (800) 123-4567',
    timestamp: new Date(Date.now() - 720000).toISOString(),
    description: 'Unusual call routing through 4 VoIP hops detected. Origin obfuscated.',
    confidence: 61, mitigated: true,
  },
  {
    id: 't5', type: 'voice_clone', severity: 'critical',
    callId: 'CALL-0xAF12', caller: '+1 (555) 901-4523',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    description: 'Deep-fake voice synthesis detected targeting executive voicemail system.',
    confidence: 99, mitigated: true,
  },
]

// ─── Mock Speakers ───────────────────────────────────────────
export const mockSpeakers: Speaker[] = [
  { id: 's1', name: 'DB-774 (Unknown)', organization: '—', profileType: 'suspect', callCount: 12, lastSeen: new Date(Date.now() - 60000).toISOString(), riskScore: 96 },
  { id: 's2', name: 'VOIP-ACTOR-021', organization: 'Offshore VoIP Cluster', profileType: 'suspect', callCount: 7, lastSeen: new Date(Date.now() - 240000).toISOString(), riskScore: 84 },
  { id: 's3', name: 'Agent Thompson', organization: 'Citibank', profileType: 'trusted', callCount: 340, lastSeen: new Date(Date.now() - 86400000).toISOString(), riskScore: 2 },
  { id: 's4', name: 'Unknown Caller', organization: '—', profileType: 'unknown', callCount: 1, lastSeen: new Date(Date.now() - 45000).toISOString(), riskScore: 38 },
]

// ─── Mock System Metrics ─────────────────────────────────────
export const mockMetrics: SystemMetric[] = [
  { label: 'Active Calls', value: 5, trend: 'up', delta: 2 },
  { label: 'Threats Detected', value: 3, unit: 'today', trend: 'up', delta: 1 },
  { label: 'Avg Risk Score', value: 54, unit: '%', trend: 'up', delta: 8 },
  { label: 'Calls Blocked', value: 17, unit: 'today', trend: 'stable' },
  { label: 'AI Accuracy', value: 99.2, unit: '%', trend: 'stable' },
  { label: 'Latency', value: 42, unit: 'ms', trend: 'down', delta: -3 },
]

// ─── Mock Waveform / Chart Data ──────────────────────────────
export function generateWaveformData(points = 60) {
  return Array.from({ length: points }, (_, i) => ({
    time: i,
    amplitude: Math.sin(i * 0.3) * 0.5 + Math.random() * 0.5,
    riskScore: Math.min(100, Math.max(0, 50 + Math.sin(i * 0.15) * 30 + Math.random() * 20 - 10)),
  }))
}

export function generateThreatTimeline() {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    critical: Math.floor(Math.random() * 3),
    high: Math.floor(Math.random() * 5),
    medium: Math.floor(Math.random() * 8),
    low: Math.floor(Math.random() * 4),
  }))
}
