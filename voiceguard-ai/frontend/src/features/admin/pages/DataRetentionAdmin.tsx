import React, { useState, useEffect } from 'react';
import {
  Archive,
  Calendar,
  Lock,
  Unlock,
  RefreshCw,
  Edit2,
  Save,
  ShieldAlert,
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import type { RetentionPolicyItem } from '../types';
import { AdminCard } from '../components/AdminCard';
import { AdminBadge } from '../components/AdminBadge';

export const DataRetentionAdmin: React.FC = () => {
  const [policies, setPolicies] = useState<RetentionPolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDays, setEditDays] = useState<number>(90);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getRetentionPolicies();
      setPolicies(data);
    } catch (err) {
      console.error('Failed to load retention policies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (policy: RetentionPolicyItem) => {
    setEditingId(policy.id);
    setEditDays(policy.retention_days);
  };

  const handleSaveDays = async (policy: RetentionPolicyItem) => {
    try {
      setSaving(true);
      await adminApi.updateRetentionPolicy(policy.id, { retention_days: editDays });
      setEditingId(null);
      await loadPolicies();
    } catch (err: any) {
      alert(err?.message || 'Failed to save retention period');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLegalHold = async (policy: RetentionPolicyItem) => {
    if (
      !window.confirm(
        policy.legal_hold
          ? `Remove legal hold on "${policy.data_category}"? Auto-deletion will resume per the configured period.`
          : `Apply legal hold on "${policy.data_category}"? All auto-deletion will be suspended until hold is lifted.`
      )
    )
      return;

    try {
      await adminApi.updateRetentionPolicy(policy.id, { legal_hold: !policy.legal_hold });
      await loadPolicies();
    } catch (err: any) {
      alert(err?.message || 'Failed to toggle legal hold');
    }
  };

  const formatCategory = (cat: string) =>
    cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Data Retention & Privacy Controls</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Configure GDPR / CCPA retention windows per data category, suspend deletion with legal hold,
            and review auto-purge schedules.
          </p>
        </div>
        <button
          onClick={loadPolicies}
          className="px-3 py-2 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Compliance Note */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
        <div>
          <div className="font-semibold text-text-primary">Compliance Advisory</div>
          <p className="text-text-secondary text-[11px] mt-0.5">
            Legal hold overrides any configured retention period. Consult your legal team before removing a hold.
            Auto-deletion permanently destroys biometric embeddings, audio samples, and call transcripts.
          </p>
        </div>
      </div>

      {/* Retention Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 p-8 text-center text-text-muted text-xs">Loading retention policies...</div>
        ) : policies.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-text-muted text-xs">No retention policies configured.</div>
        ) : (
          policies.map((policy) => (
            <AdminCard key={policy.id} bodyClassName="p-5 space-y-4">
              {/* Category Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-bg-elevated border border-border-subtle">
                    <Archive className="w-4 h-4 text-accent-blue" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-text-primary">
                      {formatCategory(policy.data_category)}
                    </h3>
                    <span className="text-[10px] font-mono text-text-muted">
                      {policy.auto_delete_enabled ? 'Auto-deletion ENABLED' : 'Manual deletion only'}
                    </span>
                  </div>
                </div>
                {policy.legal_hold && (
                  <AdminBadge label="Legal Hold" variant="warning" dot={false} size="sm" />
                )}
              </div>

              {/* Retention Period Editor */}
              <div>
                <div className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-2">
                  Retention Window
                </div>
                {editingId === policy.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={7}
                      max={3650}
                      value={editDays}
                      onChange={(e) => setEditDays(Number(e.target.value))}
                      className="w-24 px-2 py-1.5 bg-bg-elevated border border-accent-blue rounded-lg text-xs text-text-primary font-mono focus:outline-none text-center"
                    />
                    <span className="text-xs text-text-muted">days</span>
                    <button
                      disabled={saving}
                      onClick={() => handleSaveDays(policy)}
                      className="px-2.5 py-1.5 bg-accent-blue hover:bg-accent-blue/90 text-white text-xs rounded-lg flex items-center gap-1 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? 'Saving...' : 'Apply'}</span>
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1.5 text-xs text-text-muted hover:text-text-primary"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-bg-elevated/60 border border-border-subtle">
                    <div className="flex items-center gap-2 text-xs">
                      <Calendar className="w-4 h-4 text-accent-blue" />
                      <span className="font-mono font-bold text-text-primary text-sm">
                        {policy.retention_days}
                      </span>
                      <span className="text-text-muted">days retention</span>
                    </div>
                    <button
                      onClick={() => handleStartEdit(policy)}
                      className="px-2 py-1 text-[11px] text-accent-blue hover:bg-accent-blue/10 rounded border border-accent-blue/20 flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Legal Hold Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-bg-elevated/40 border border-border-subtle text-xs">
                <div className="flex items-center gap-2">
                  {policy.legal_hold ? (
                    <Lock className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Unlock className="w-4 h-4 text-text-muted" />
                  )}
                  <span className="text-text-secondary">
                    {policy.legal_hold ? 'Legal hold active — deletion suspended' : 'No legal hold applied'}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleLegalHold(policy)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors ${
                    policy.legal_hold
                      ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                      : 'border-slate-500/30 text-slate-400 hover:bg-slate-500/10'
                  }`}
                >
                  {policy.legal_hold ? 'Release Hold' : 'Apply Hold'}
                </button>
              </div>
            </AdminCard>
          ))
        )}
      </div>
    </div>
  );
};

