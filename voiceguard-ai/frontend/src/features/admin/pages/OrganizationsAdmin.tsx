import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  Users,
  Smartphone,
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import type { OrganizationItem } from '../types';
import { AdminCard } from '../components/AdminCard';
import { AdminBadge } from '../components/AdminBadge';
import { AdminModal } from '../components/AdminModal';

export const OrganizationsAdmin: React.FC = () => {
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    org_type: 'enterprise',
    contact_email: '',
    contact_phone: '',
    plan_tier: 'enterprise',
  });

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getOrganizations();
      setOrganizations(data);
    } catch (err) {
      console.error('Failed to load organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await adminApi.createOrganization(formData);
      setIsModalOpen(false);
      setFormData({
        name: '',
        org_type: 'enterprise',
        contact_email: '',
        contact_phone: '',
        plan_tier: 'enterprise',
      });
      await loadOrganizations();
    } catch (err: any) {
      alert(err?.message || 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (org: OrganizationItem) => {
    const action = org.status === 'active' ? 'suspend' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${org.name}?`)) return;

    try {
      if (org.status === 'active') {
        await adminApi.suspendOrganization(org.id);
      } else {
        await adminApi.activateOrganization(org.id);
      }
      await loadOrganizations();
    } catch (err: any) {
      alert(err?.message || `Failed to ${action} organization`);
    }
  };

  const filteredOrgs = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.contact_email.toLowerCase().includes(search.toLowerCase()) ||
      org.org_type.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Organization & Tenant Governance</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Configure multi-tenant boundaries, enterprise subscription tiers, and tenant administrative parameters.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-lg text-xs font-semibold shadow-md transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Provision Organization</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by organization name, email, or vertical..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="suspended">Suspended Only</option>
          <option value="pending">Pending</option>
        </select>
        <button
          onClick={loadOrganizations}
          className="px-3 py-2 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Organizations Table */}
      <AdminCard bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-secondary/60 text-text-muted border-b border-border-subtle">
              <tr>
                <th className="py-3 px-4 font-semibold">Organization</th>
                <th className="py-3 px-4 font-semibold">Type / Sector</th>
                <th className="py-3 px-4 font-semibold">Tier</th>
                <th className="py-3 px-4 font-semibold">Allocated Users</th>
                <th className="py-3 px-4 font-semibold">Endpoints</th>
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
                      <span>Loading organizations...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted">
                    No organizations matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-bg-elevated/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-text-primary">{org.name}</div>
                      <div className="text-[11px] text-text-muted font-mono">{org.contact_email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] capitalize">{org.org_type}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                        {org.plan_tier}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-text-secondary">
                        <Users className="w-3.5 h-3.5 text-text-muted" />
                        <span>{org.active_users_count}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-text-secondary">
                        <Smartphone className="w-3.5 h-3.5 text-text-muted" />
                        <span>{org.active_devices_count}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <AdminBadge
                        label={org.status}
                        variant={
                          org.status === 'active'
                            ? 'success'
                            : org.status === 'suspended'
                            ? 'danger'
                            : 'warning'
                        }
                        size="sm"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(org)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                          org.status === 'active'
                            ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                            : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                      >
                        {org.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {/* Provision Organization Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Provision Enterprise Tenant"
        description="Creates an isolated tenant boundary with distinct policies, API keys, and user directory."
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Organization Legal Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Defense Global"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Organization Type</label>
              <select
                value={formData.org_type}
                onChange={(e) => setFormData({ ...formData, org_type: e.target.value })}
                className="w-full px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
              >
                <option value="enterprise">Enterprise</option>
                <option value="financial">Financial Institution</option>
                <option value="healthcare">Healthcare Provider</option>
                <option value="government">Government / Defense</option>
                <option value="telecom">Telecommunications</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Plan Subscription Tier</label>
              <select
                value={formData.plan_tier}
                onChange={(e) => setFormData({ ...formData, plan_tier: e.target.value })}
                className="w-full px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
              >
                <option value="enterprise">Enterprise Tier</option>
                <option value="business">Business Tier</option>
                <option value="starter">Starter Pilot</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Primary Security Contact Email</label>
            <input
              type="email"
              required
              placeholder="secops@company.com"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              className="w-full px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Contact Phone (Optional)</label>
            <input
              type="tel"
              placeholder="+1-800-555-0199"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              className="w-full px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
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
              {submitting ? 'Provisioning...' : 'Provision Tenant'}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
};

