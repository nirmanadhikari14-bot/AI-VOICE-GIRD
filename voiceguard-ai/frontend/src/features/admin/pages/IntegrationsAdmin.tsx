import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Radio,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import type { IntegrationItem } from '../types';
import { AdminCard } from '../components/AdminCard';
import { AdminBadge } from '../components/AdminBadge';
import { AdminModal } from '../components/AdminModal';

interface ContextType {
  selectedOrgId: number | null;
}

export const IntegrationsAdmin: React.FC = () => {
  const { selectedOrgId } = useOutletContext<ContextType>();

  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; message: string; success: boolean } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    provider_type: 'sip_trunk',
    endpoint_url: '',
    secret_key: '',
    config_json: '{}',
  });

  useEffect(() => {
    loadIntegrations();
  }, [selectedOrgId]);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getIntegrations(selectedOrgId || undefined);
      setIntegrations(data);
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (integration: IntegrationItem) => {
    try {
      setTestingId(integration.id);
      setTestResult(null);
      const res = await adminApi.testIntegration(integration.id);
      setTestResult({
        id: integration.id,
        message: `${res.message} (Latency: ${res.latency_ms}ms)`,
        success: res.status === 'healthy',
      });
      await loadIntegrations();
    } catch (err: any) {
      setTestResult({
        id: integration.id,
        message: err?.message || 'Connection test probe failed',
        success: false,
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(formData.config_json);
      } catch {
        alert('Invalid JSON in configuration field');
        setSubmitting(false);
        return;
      }

      await adminApi.createIntegration({
        name: formData.name,
        provider_type: formData.provider_type,
        endpoint_url: formData.endpoint_url || undefined,
        secret_key: formData.secret_key || undefined,
        config_json: parsedConfig,
        organization_id: selectedOrgId || undefined,
      });

      setIsModalOpen(false);
      setFormData({
        name: '',
        provider_type: 'sip_trunk',
        endpoint_url: '',
        secret_key: '',
        config_json: '{}',
      });
      await loadIntegrations();
    } catch (err: any) {
      alert(err?.message || 'Failed to register integration');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">API & Telephony Integrations</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Connect carrier SIP trunks, enterprise PBX bridges, multi-factor SMS gateways, and threat feeds with credential masking.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-lg text-xs font-semibold shadow-md transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Connect Integration</span>
        </button>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 p-8 text-center text-text-muted text-xs">Loading external integrations...</div>
        ) : integrations.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-text-muted text-xs">No active provider integrations found.</div>
        ) : (
          integrations.map((item) => (
            <AdminCard
              key={item.id}
              className="flex flex-col justify-between"
              bodyClassName="p-5 flex-1 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-bg-elevated border border-border-subtle text-accent-cyan">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs text-text-primary">{item.name}</h3>
                      <span className="text-[10px] font-mono uppercase text-accent-blue">
                        {item.provider_type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <AdminBadge
                    label={item.health_status}
                    variant={
                      item.health_status === 'healthy'
                        ? 'success'
                        : item.health_status === 'degraded'
                        ? 'warning'
                        : 'danger'
                    }
                    size="sm"
                  />
                </div>

                <div className="space-y-2 text-xs">
                  {item.endpoint_url && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-bg-elevated/50 border border-border-subtle">
                      <span className="text-text-muted text-[11px]">Endpoint URL</span>
                      <span className="font-mono text-[11px] text-text-secondary truncate max-w-xs">
                        {item.endpoint_url}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-2 rounded-lg bg-bg-elevated/50 border border-border-subtle">
                    <span className="text-text-muted text-[11px]">Secret Credential</span>
                    <span className="font-mono text-[11px] text-text-muted tracking-widest">
                      {item.secret_masked || '••••••••••••••••'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-text-muted px-1">
                    <span>Last Health Probe:</span>
                    <span className="font-mono">
                      {item.last_health_check ? new Date(item.last_health_check).toLocaleTimeString() : 'Pending'}
                    </span>
                  </div>
                </div>

                {testResult?.id === item.id && (
                  <div
                    className={`mt-3 p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                      testResult.success
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                    }`}
                  >
                    {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
                <button
                  disabled={testingId === item.id}
                  onClick={() => handleTestConnection(item)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-accent-blue/15 hover:bg-accent-blue/25 text-accent-blue border border-accent-blue/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Zap className={`w-3.5 h-3.5 ${testingId === item.id ? 'animate-spin' : ''}`} />
                  <span>{testingId === item.id ? 'Probing...' : 'Test Diagnostics'}</span>
                </button>
              </div>
            </AdminCard>
          ))
        )}
      </div>

      {/* Connect Integration Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Connect External Provider"
        description="Registers a carrier SIP trunk, SMS gateway, or security telemetry connector."
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Integration Friendly Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Primary Telnyx SIP Trunk"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Provider Service Type</label>
            <select
              value={formData.provider_type}
              onChange={(e) => setFormData({ ...formData, provider_type: e.target.value })}
              className="w-full px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
            >
              <option value="sip_trunk">Carrier SIP Trunk</option>
              <option value="pbx_bridge">Enterprise PBX Bridge (Asterisk/FreeSWITCH)</option>
              <option value="sms_gateway">SMS Gateway (Twilio/Vonage)</option>
              <option value="push_gateway">Mobile Push Gateway (FCM/APNs)</option>
              <option value="threat_intel">Threat Intelligence Feed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Gateway Endpoint URL</label>
            <input
              type="text"
              placeholder="sip://sip.carrier.net:5060 or https://api.gateway.com/v1"
              value={formData.endpoint_url}
              onChange={(e) => setFormData({ ...formData, endpoint_url: e.target.value })}
              className="w-full px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">API Secret / Auth Token</label>
            <input
              type="password"
              placeholder="••••••••••••••••"
              value={formData.secret_key}
              onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
              className="w-full px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue font-mono"
            />
            <p className="text-[10px] text-text-muted mt-1">Credentials will be securely encrypted and masked.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Advanced Parameters (JSON)</label>
            <textarea
              rows={3}
              value={formData.config_json}
              onChange={(e) => setFormData({ ...formData, config_json: e.target.value })}
              className="w-full p-2.5 font-mono text-xs bg-bg-elevated border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-accent-blue hover:bg-accent-blue/90 text-white shadow-md disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Register Integration'}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
};

