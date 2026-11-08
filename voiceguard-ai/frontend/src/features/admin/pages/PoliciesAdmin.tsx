import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ShieldAlert,
  Bell,
  AlertTriangle,
  Lock,
  RefreshCw,
  Power,
  Edit2,
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import type { PolicyItem } from '../types';
import { AdminCard } from '../components/AdminCard';
import { AdminBadge } from '../components/AdminBadge';
import { AdminModal } from '../components/AdminModal';

export const PoliciesAdmin: React.FC = () => {
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [editingPolicy, setEditingPolicy] = useState<PolicyItem | null>(null);
  const [editConfigText, setEditConfigText] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getPolicies();
      setPolicies(data);
    } catch (err) {
      console.error('Failed to load policies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (policy: PolicyItem) => {
    try {
      await adminApi.togglePolicy(policy.id);
      await loadPolicies();
    } catch (err: any) {
      alert(err?.message || 'Failed to toggle policy');
    }
  };

  const handleOpenEdit = (policy: PolicyItem) => {
    setEditingPolicy(policy);
    setEditConfigText(JSON.stringify(policy.configuration || {}, null, 2));
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;
    try {
      setSaving(true);
      const parsedConfig = JSON.parse(editConfigText);
      await adminApi.updatePolicy(editingPolicy.id, {
        configuration: parsedConfig,
      });
      setEditingPolicy(null);
      await loadPolicies();
    } catch (err: any) {
      alert('Invalid JSON configuration or update error: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const policyTypes = ['all', 'risk', 'prevention', 'alert', 'incident', 'auth'];

  const filteredPolicies = policies.filter((p) => {
    if (activeTab === 'all') return true;
    return p.policy_type === activeTab;
  });

  const getPolicyIcon = (type: string) => {
    switch (type) {
      case 'risk':
        return <Sliders className="w-4 h-4 text-accent-blue" />;
      case 'prevention':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case 'alert':
        return <Bell className="w-4 h-4 text-amber-400" />;
      case 'incident':
        return <AlertTriangle className="w-4 h-4 text-purple-400" />;
      case 'auth':
        return <Lock className="w-4 h-4 text-emerald-400" />;
      default:
        return <Sliders className="w-4 h-4 text-text-muted" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Security Policy Governance</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Configure risk scoring engine weights, automated clone prevention actions, alert triggers, and authentication controls.
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

      {/* Type Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-3 overflow-x-auto">
        {policyTypes.map((type) => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              activeTab === type
                ? 'bg-accent-blue text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            {type === 'all' ? 'All Policies' : `${type} Policies`}
          </button>
        ))}
      </div>

      {/* Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 p-8 text-center text-text-muted text-xs">Loading security policies...</div>
        ) : filteredPolicies.length === 0 ? (
          <div className="col-span-2 p-8 text-center text-text-muted text-xs">No policies in this category.</div>
        ) : (
          filteredPolicies.map((policy) => (
            <AdminCard
              key={policy.id}
              className="flex flex-col justify-between"
              bodyClassName="p-5 flex-1 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-bg-elevated border border-border-subtle">
                      {getPolicyIcon(policy.policy_type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs text-text-primary">{policy.name}</h3>
                      <span className="text-[10px] font-mono uppercase text-accent-cyan tracking-wider">
                        {policy.policy_type}
                      </span>
                    </div>
                  </div>
                  <AdminBadge
                    label={policy.enabled ? 'Active' : 'Disabled'}
                    variant={policy.enabled ? 'success' : 'neutral'}
                    size="sm"
                  />
                </div>

                <p className="text-xs text-text-muted mb-4">{policy.description || 'No description provided.'}</p>

                {/* Configuration JSON View */}
                {policy.configuration && (
                  <div className="mb-4">
                    <div className="text-[10px] uppercase font-mono text-text-muted mb-1">Active Parameters</div>
                    <pre className="p-2.5 rounded-lg bg-bg-elevated/70 border border-border-subtle text-[11px] font-mono text-text-secondary max-h-36 overflow-y-auto">
                      {JSON.stringify(policy.configuration, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
                <button
                  onClick={() => handleOpenEdit(policy)}
                  className="px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-elevated hover:bg-bg-elevated/80 rounded-lg border border-border-subtle flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Configure</span>
                </button>
                <button
                  onClick={() => handleToggle(policy)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors ${
                    policy.enabled
                      ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                      : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{policy.enabled ? 'Disable' : 'Enable'}</span>
                </button>
              </div>
            </AdminCard>
          ))
        )}
      </div>

      {/* Edit Policy Config Modal */}
      <AdminModal
        isOpen={!!editingPolicy}
        onClose={() => setEditingPolicy(null)}
        title={`Configure ${editingPolicy?.name}`}
        description="Fine-tune algorithmic thresholds, weights, or escalation parameters in JSON format."
        size="md"
      >
        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Configuration Payload (JSON)
            </label>
            <textarea
              rows={10}
              value={editConfigText}
              onChange={(e) => setEditConfigText(e.target.value)}
              className="w-full p-3 font-mono text-xs bg-bg-elevated border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-subtle">
            <button
              type="button"
              onClick={() => setEditingPolicy(null)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-accent-blue hover:bg-accent-blue/90 text-white shadow-md disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
};

