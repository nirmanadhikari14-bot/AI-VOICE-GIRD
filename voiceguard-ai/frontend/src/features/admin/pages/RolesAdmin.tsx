import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  Check,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import type { RoleItem, PermissionItem } from '../types';
import { AdminCard } from '../components/AdminCard';

export const RolesAdmin: React.FC = () => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permsData] = await Promise.all([
        adminApi.getRoles(),
        adminApi.getPermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permsData);
      if (rolesData.length > 0 && !selectedRole) {
        setSelectedRole(rolesData[0]);
      }
    } catch (err) {
      console.error('Failed to load RBAC data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group permissions by category
  const categories = Array.from(new Set(permissions.map((p) => p.category)));

  const selectedRolePermCodes = new Set(selectedRole?.permissions.map((p) => p.code) || []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Role-Based Access Control (RBAC)</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Fine-grained entitlement management, privilege separation boundaries, and permission matrix governance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="px-3 py-2 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload RBAC</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Defined Roles</h2>
          <div className="space-y-2">
            {loading ? (
              <div className="p-8 text-center text-text-muted text-xs">Loading roles...</div>
            ) : (
              roles.map((role) => {
                const isSelected = selectedRole?.id === role.id;
                return (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-accent-blue/10 border-accent-blue/40 shadow-sm'
                        : 'bg-bg-card border-border-subtle hover:border-border-default'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className={`w-4 h-4 ${isSelected ? 'text-accent-blue' : 'text-text-muted'}`} />
                        <span className="font-semibold text-xs text-text-primary">{role.name}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-elevated border border-border-subtle text-text-muted">
                        {role.user_count} users
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted line-clamp-2">{role.description || 'System standard RBAC role'}</p>
                    <div className="mt-2.5 flex items-center gap-2 text-[10px] text-text-secondary">
                      <Key className="w-3 h-3 text-accent-cyan" />
                      <span>{role.permissions.length} granted permissions</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Permission Matrix Inspection for Selected Role */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Permission Matrix: <span className="text-accent-blue font-bold">{selectedRole?.name}</span>
            </h2>
            <div className="text-xs text-text-muted font-mono">
              {selectedRole?.permissions.length} of {permissions.length} active
            </div>
          </div>

          <AdminCard bodyClassName="p-0">
            <div className="p-4 border-b border-border-subtle bg-bg-secondary/40 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-text-primary">{selectedRole?.name} Entitlements</h3>
                <p className="text-[11px] text-text-muted">{selectedRole?.description}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Enforced Server-Side</span>
              </div>
            </div>

            <div className="p-4 space-y-6 max-h-[600px] overflow-y-auto">
              {categories.map((category) => {
                const permsInCategory = permissions.filter((p) => p.category === category);
                return (
                  <div key={category} className="space-y-2">
                    <div className="text-[11px] font-bold text-accent-cyan uppercase tracking-wider font-mono">
                      Category: {category}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {permsInCategory.map((perm) => {
                        const isGranted = selectedRolePermCodes.has(perm.code);
                        return (
                          <div
                            key={perm.id}
                            className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs transition-colors ${
                              isGranted
                                ? 'bg-emerald-500/5 border-emerald-500/20 text-text-primary'
                                : 'bg-bg-elevated/20 border-border-subtle text-text-muted opacity-60'
                            }`}
                          >
                            <div
                              className={`mt-0.5 p-1 rounded-full ${
                                isGranted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              <Check className="w-2.5 h-2.5" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-[11px] font-mono">{perm.code}</div>
                              <div className="text-[10px] text-text-muted leading-tight mt-0.5">{perm.description}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
};

