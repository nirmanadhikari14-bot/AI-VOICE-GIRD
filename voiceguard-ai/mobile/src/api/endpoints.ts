// Centralized API Endpoints Configuration
export const API_CONFIG = {
  // Configurable base URL. Default points to local development backend.
  // Physical phones need host computer LAN IP (e.g. http://192.168.1.100:8000).
  DEFAULT_BASE_URL: 'http://127.0.0.1:8000',
  TIMEOUT_MS: 10000,
  RETRY_COUNT: 2,
  WS_URL: 'ws://127.0.0.1:8000/ws/v1/test',
};

export const ENDPOINTS = {
  // System & Health
  HEALTH: '/api/v1/health',
  STATUS: '/api/v1/status',

  // Authentication
  LOGIN: '/api/v1/auth/login',
  ME: '/api/v1/auth/me',

  // Phase 17 & Phase 18 Risk & Explainability
  RISK_LATEST: '/api/v1/risk/latest',
  RISK_DETAIL: (callId: number | string) => `/api/v1/risk/${callId}`,
  RISK_EXPLAIN: (callId: number | string) => `/api/v1/risk/explain/${callId}`,

  // Phase 19 Alerts
  ALERTS: '/api/v1/alerts',
  ALERT_DETAIL: (id: number | string) => `/api/v1/alerts/${id}`,
  ALERT_ACKNOWLEDGE: (id: number | string) => `/api/v1/alerts/${id}/acknowledge`,
  ALERT_DISMISS: (id: number | string) => `/api/v1/alerts/${id}/dismiss`,

  // Phase 20 Prevention
  PREVENTION_ACTIONS: '/api/v1/prevention/actions',
  PREVENTION_ACTION_DETAIL: (id: number | string) => `/api/v1/prevention/actions/${id}`,
  PREVENTION_APPROVE: (id: number | string) => `/api/v1/prevention/actions/${id}/approve`,
  PREVENTION_EXECUTE: (id: number | string) => `/api/v1/prevention/actions/${id}/execute`,

  // Phase 21 Incidents
  INCIDENTS: '/api/v1/incidents',
  INCIDENT_DETAIL: (id: number | string) => `/api/v1/incidents/${id}`,
  INCIDENT_NOTES: (id: number | string) => `/api/v1/incidents/${id}/notes`,
  INCIDENT_STATUS: (id: number | string) => `/api/v1/incidents/${id}/status`,

  // Secondary Verification
  VERIFICATION_REQUEST: '/api/v1/verification/request',
  VERIFICATION_STATUS: (id: number | string) => `/api/v1/verification/status/${id}`,
  VERIFICATION_VERIFY: '/api/v1/verification/verify',

  // Device & Push Notifications
  DEVICE_REGISTER: '/api/v1/devices/register',
  DEVICE_UNREGISTER: (token: string) => `/api/v1/devices/${token}`,

  // Reporting & Calls
  REPORT_SUSPICIOUS: '/api/v1/reports/suspicious',
  CALLS_ACTIVE: '/api/v1/calls/active',
  CALL_DETAIL: (id: number | string) => `/api/v1/calls/${id}`,
};
