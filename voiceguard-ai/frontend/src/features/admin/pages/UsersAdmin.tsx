import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  UserPlus,
  Search,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import type { AdminUserItem, OrganizationItem, RoleItem } from '../types';
import { AdminCard } from '../components/AdminCard';
import { AdminBadge } from '../components/AdminBadge';
import { AdminModal } from '../components/AdminModal';

interface ContextType {
  selectedOrgId: number | null;
}

export const UsersAdmin: React.FC = () => {
  const { selectedOrgId } = useOutletContext<ContextType>();

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_id: 1,
    organization_id: selectedOrgId || 1,
  });

  useEffect(() => {
    loadData();
  }, [selectedOrgId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, orgsData, rolesData] = await Promise.all([
        adminApi.getUsers(selectedOrgId || undefined),
        adminApi.getOrganizations(),
        adminApi.getRoles(),
      ]);
      setUsers(usersData);
      setOrganizations(orgsData);
      setRoles(rolesData);
      if (orgsData.length > 0 && !formData.organization_id) {
        setFormData((prev) => ({ ...prev, organization_id: selectedOrgId || orgsData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await adminApi.createUser({
        ...formData,
        organization_id: Number(formData.organization_id),
        role_id: Number(formData.role_id),
      });
      setIsModalOpen(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role_id: roles[0]?.id || 1,
        organization_id: selectedOrgId || organizations[0]?.id || 1,
      });
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: AdminUserItem) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`Are you sure you want to mark ${user.email} as ${nextStatus}?`)) return;

    try {
      await adminApi.updateUserStatus(user.id, nextStatus);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to update user status');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
      (u.organization_name && u.organization_name.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role_name === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">User & Account Directory</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Manage administrative identities, role-based access entitlements, and tenant association boundaries.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-lg text-xs font-semibold shadow-md transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision User</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name, email, or tenant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue transition-colors"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
        >
          <option value="all">All Roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
        <button
          onClick={loadData}
          className="px-3 py-2 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Users Table */}
      <AdminCard bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-secondary/60 text-text-muted border-b border-border-subtle">
              <tr>
                <th className="py-3 px-4 font-semibold">User Identity</th>
                <th className="py-3 px-4 font-semibold">Assigned Role</th>
                <th className="py-3 px-4 font-semibold">Tenant Organization</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Created</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-accent-blue" />
                      <span>Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-bg-elevated/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-text-primary">{u.name || 'Anonymous User'}</div>
                      <div className="text-[11px] text-text-muted font-mono">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                        {u.role_name || 'No Role'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <Building2 className="w-3.5 h-3.5 text-text-muted" />
                        <span>{u.organization_name || 'Global / Unassigned'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <AdminBadge
                        label={u.status}
                        variant={u.status === 'active' ? 'success' : 'danger'}
                        size="sm"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-text-muted font-mono text-[11px]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                          u.status === 'active'
                            ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                            : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                      >
                        {u.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {/* Provision User Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Provision Platform User"
        description="Creates an authorized administrative or operator account with assigned permissions."
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Full Legal Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Sarah Jenkins"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="s.jenkins@citibank.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Initial Password</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Tenant Organization</label>
              <select
                value={formData.organization_id}
                onChange={(e) => setFormData({ ...formData, organization_id: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Role Entitlement</label>
              <select
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-bg-elevated border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
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
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
};

