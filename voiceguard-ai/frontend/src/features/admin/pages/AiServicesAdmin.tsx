import React, { useState, useEffect } from 'react';
import {
  Cpu,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import type { ModelServiceItem } from '../types';
import { AdminCard } from '../components/AdminCard';
import { AdminBadge } from '../components/AdminBadge';
import { AdminModal } from '../components/AdminModal';

export const AiServicesAdmin: React.FC = () => {
  const [services, setServices] = useState<ModelServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollbackTarget, setRollbackTarget] = useState<ModelServiceItem | null>(null);
  const [rollbackVersion, setRollbackVersion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAiServices();
      setServices(data);
    } catch (err) {
      console.error('Failed to load AI model services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollbackTarget) return;
    try {
      setSubmitting(true);
      await adminApi.rollbackAiService(rollbackTarget.id, rollbackVersion);
      setRollbackTarget(null);
      setRollbackVersion('');
      await loadServices();
    } catch (err: any) {
      alert(err?.message || 'Failed to trigger model version rollback');
    } finally {
      setSubmitting(false);
    }
  };

  const latencyColor = (ms: number) => {
    if (ms < 100) return 'text-emerald-400';
    if (ms < 250) return 'text-amber-400';
    return 'text-rose-400';
  };

  const latencyBarWidth = (ms: number) => {
    return Math.min((ms / 500) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">AI Model Service Inventory</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Monitor deployed inference models — vocoder, speaker embedding, prosody, risk engine versions, latency telemetry, and controlled rollback.
          </p>
        </div>
        <button
          onClick={loadServices}
          className="px-3 py-2 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Services Table */}
      <AdminCard bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-secondary/60 text-text-muted border-b border-border-subtle">
              <tr>
                <th className="py-3 px-4 font-semibold">Model Service</th>
                <th className="py-3 px-4 font-semibold">Identifier</th>
                <th className="py-3 px-4 font-semibold">Version</th>
                <th className="py-3 px-4 font-semibold">Device Target</th>
                <th className="py-3 px-4 font-semibold">P95 Latency</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-accent-blue" />
                      <span>Loading AI model registry...</span>
                    </div>
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted">No AI model services registered.</td>
                </tr>
              ) : (
                services.map((svc) => (
                  <tr key={svc.id} className="hover:bg-bg-elevated/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-accent-blue/10 border border-accent-blue/20">
                          <Cpu className="w-3.5 h-3.5 text-accent-blue" />
                        </div>
                        <div>
                          <div className="font-semibold text-text-primary">{svc.service_name}</div>
                          <div className="text-[10px] text-text-muted">
                            {svc.active ? 'Primary inference endpoint' : 'Inactive / Standby'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-accent-cyan">{svc.model_identifier}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        v{svc.model_version}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] uppercase text-text-secondary">
                      {svc.device_target}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={`font-mono font-medium ${latencyColor(svc.latency_p95_ms)}`}>
                            {svc.latency_p95_ms}ms
                          </span>
                        </div>
                        <div className="w-24 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${latencyColor(svc.latency_p95_ms).replace('text-', 'bg-')}`}
                            style={{ width: `${latencyBarWidth(svc.latency_p95_ms)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <AdminBadge
                        label={svc.deployment_status}
                        variant={
                          svc.deployment_status === 'production'
                            ? 'success'
                            : svc.deployment_status === 'staging'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="sm"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setRollbackTarget(svc);
                          setRollbackVersion('');
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 rounded transition-colors inline-flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Rollback</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {/* Rollback Confirmation Modal */}
      <AdminModal
        isOpen={!!rollbackTarget}
        onClose={() => setRollbackTarget(null)}
        title={`Model Version Rollback — ${rollbackTarget?.service_name}`}
        description="Downgrade to a verified prior checkpoint. Change takes effect after the next inference worker restart."
        size="sm"
      >
        <form onSubmit={handleRollback} className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Rolling back <strong>{rollbackTarget?.service_name}</strong> from current{' '}
              <span className="font-mono">v{rollbackTarget?.model_version}</span> will affect all real-time detection accuracy until revalidated.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Target Version Tag</label>
            <input
              type="text"
              required
              placeholder="e.g. 1.2.0 or 1.1.5-hotfix"
              value={rollbackVersion}
              onChange={(e) => setRollbackVersion(e.target.value)}
              className="w-full px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-xs text-text-primary font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setRollbackTarget(null)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{submitting ? 'Rolling back...' : 'Confirm Rollback'}</span>
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
};

