export const DESKTOP_API_CONFIG = {
  DEFAULT_BASE_URL: 'http://127.0.0.1:8000',
  DEFAULT_WS_URL: 'ws://127.0.0.1:8000/ws/v1/test',
  TIMEOUT_MS: 12000,
  RETRY_COUNT: 2,
};

export const DESKTOP_ENDPOINTS = {
  // System Health
  HEALTH: '/api/v1/health',
  SYSTEM_HEALTH: '/api/v1/system/health',

  // Authentication
  LOGIN: '/api/v1/auth/login',
  ME: '/api/v1/auth/me',

  // Risk & Explainability (Phase 17 & Phase 18)
  RISK_LATEST: '/api/v1/risk/latest',
  RISK_DETAIL: (callId: number | string) => `/api/v1/risk/${callId}`,
  RISK_EXPLAIN: (callId: number | string) => `/api/v1/risk/explain/${callId}`,

  // Alerts (Phase 19)
  ALERTS: '/api/v1/alerts',
  ALERT_DETAIL: (id: number | string) => `/api/v1/alerts/${id}`,
  ALERT_ACKNOWLEDGE: (id: number | string) => `/api/v1/alerts/${id}/acknowledge`,
  ALERT_DISMISS: (id: number | string) => `/api/v1/alerts/${id}/dismiss`,

  // Incidents (Phase 21)
  INCIDENTS: '/api/v1/incidents',
  INCIDENT_DETAIL: (id: number | string) => `/api/v1/incidents/${id}`,
  INCIDENT_DETAILS: (id: number | string) => `/api/v1/incidents/${id}`,
  INCIDENT_NOTES: (id: number | string) => `/api/v1/incidents/${id}/notes`,
  INCIDENT_STATUS: (id: number | string) => `/api/v1/incidents/${id}/status`,

  // Prevention Actions (Phase 20)
  PREVENTION_ACTIONS: '/api/v1/prevention/actions',
  PREVENTION_ACTION_DETAIL: (id: number | string) => `/api/v1/prevention/actions/${id}`,
  PREVENTION_APPROVE: (id: number | string) => `/api/v1/prevention/actions/${id}/approve`,
  PREVENTION_EXECUTE: (id: number | string) => `/api/v1/prevention/actions/${id}/execute`,

  // Calls & Sessions
  CALLS: '/api/v1/calls',
  CALLS_ACTIVE: '/api/v1/calls/active',
  CALL_DETAIL: (id: number | string) => `/api/v1/calls/${id}`,

  // Threat Intelligence (Phase 16)
  THREAT_INDICATORS: '/api/v1/threats/indicators',
  THREAT_INDICATOR_DETAIL: (id: number | string) => `/api/v1/threats/indicators/${id}`,
  CREATE_THREAT_INDICATOR: '/api/v1/threats/indicators',

  // Audit Logs
  AUDIT_LOGS: '/api/v1/audit/logs',

  // Global Search
  SEARCH: '/api/v1/search',
};
