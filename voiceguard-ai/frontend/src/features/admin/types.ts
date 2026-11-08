export interface OrganizationItem {
  id: number;
  name: string;
  org_type: string;
  status: 'active' | 'pending' | 'suspended' | 'inactive' | 'archived';
  contact_email: string;
  contact_phone?: string | null;
  primary_admin_id?: number | null;
  plan_tier: string;
  settings_json?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
  active_users_count: number;
  active_devices_count: number;
}

export interface AdminUserItem {
  id: number;
  name?: string | null;
  email: string;
  role_id?: number | null;
  role_name?: string | null;
  organization_id?: number | null;
  organization_name?: string | null;
  status: 'active' | 'suspended' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface PermissionItem {
  id: number;
  code: string;
  name: string;
  category: string;
  description?: string | null;
}

export interface RoleItem {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  permissions: PermissionItem[];
  user_count: number;
}

export interface PolicyItem {
  id: number;
  name: string;
  description?: string | null;
  policy_type: 'risk' | 'prevention' | 'alert' | 'incident' | 'auth';
  configuration?: Record<string, any> | null;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DeviceAdminItem {
  id: number;
  user_id: number;
  user_email?: string | null;
  device_token: string;
  platform: string;
  device_name?: string | null;
  push_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IntegrationItem {
  id: number;
  organization_id?: number | null;
  name: string;
  provider_type: string;
  status: 'active' | 'disabled' | 'error';
  endpoint_url?: string | null;
  config_json?: Record<string, any> | null;
  secret_masked?: string | null;
  last_health_check?: string | null;
  health_status: 'healthy' | 'degraded' | 'error';
  created_at?: string;
}

export interface VoiceProfileAdminItem {
  id: number;
  speaker_id: string;
  profile_name: string;
  baseline_confidence?: number | null;
  embedding_count: number;
  verification_status: string;
  consent_recorded: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RetentionPolicyItem {
  id: number;
  organization_id?: number | null;
  data_category: string;
  retention_days: number;
  auto_delete_enabled: boolean;
  legal_hold: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ModelServiceItem {
  id: number;
  service_name: string;
  model_identifier: string;
  model_version: string;
  deployment_status: string;
  device_target: string;
  latency_p95_ms: number;
  active: boolean;
  updated_at?: string;
}

export interface SystemConfigItem {
  id: number;
  config_key: string;
  config_value: any;
  category: string;
  is_secret: boolean;
  updated_at?: string;
}

export interface AdminAuditLogItem {
  id: number;
  user_id?: number | null;
  user_email?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details?: any;
  ip_address?: string | null;
  created_at?: string;
}

export interface AdminOverviewKPIs {
  total_organizations: number;
  active_organizations: number;
  suspended_organizations: number;
  total_users: number;
  active_users: number;
  registered_devices: number;
  active_calls: number;
  security_alerts: number;
  open_incidents: number;
  prevention_actions: number;
  active_integrations: number;
  system_health_status: string;
  last_updated: string;
}
