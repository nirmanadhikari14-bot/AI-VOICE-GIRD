import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Smartphone,
  Shield,
  FileCheck,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import type { AdminOverviewKPIs, OrganizationItem } from '../types';
import { AdminCard } from '../components/AdminCard';
import { AdminBadge } from '../components/AdminBadge';

interface ContextType {
  selectedOrgId: number | null;
}

export const AdminOverview: React.FC = () => {
  const { selectedOrgId } = useOutletContext<ContextType>();
  const navigate = useNavigate();

  const [kpis, setKpis] = useState<AdminOverviewKPIs | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedOrgId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [kpiData, orgsData] = await Promise.all([
        adminApi.getOverview(selectedOrgId || undefined),
        adminApi.getOrganizations(),
      ]);
      setKpis(kpiData);
      setOrganizations(orgsData);
    } catch (err: any) {
      console.error('Failed to load admin overview data:', err);
      setError(err?.message || 'Error connecting to administration service');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-text-muted text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-accent-blue" />
          <span>Loading governance telemetry...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
        <div className="flex items-center gap-2 font-semibold mb-1">
          <AlertTriangle className="w-5 h-5" />
          <span>Administrative Telemetry Error</span>
        </div>
        <p className="text-xs text-rose-300">{error}</p>
        <button
          onClick={loadData}
          className="mt-3 px-3 py-1.5 text-xs bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-rose-200"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Managed Tenants',
      value: kpis?.total_organizations ?? 0,
      subtext: `${kpis?.active_organizations ?? 0} active, ${kpis?.suspended_organizations ?? 0} suspended`,
      icon: Building2,
      color: 'text-accent-blue',
      bgColor: 'bg-accent-blue/10',
      path: '/admin/organizations',
    },
    {
      label: 'Administered Users',
      value: kpis?.total_users ?? 0,
      subtext: `${kpis?.active_users ?? 0} accounts active`,
      icon: Users,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      path: '/admin/users',
    },
    {
      label: 'Registered Endpoints',
      value: kpis?.registered_devices ?? 0,
      subtext: 'Mobile & Desktop security clients',
      icon: Smartphone,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      path: '/admin/devices',
    },
    {
      label: 'Prevention Interventions',
      value: kpis?.prevention_actions ?? 0,
      subtext: 'Automated clone mitigation triggers',
      icon: Shield,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      path: '/admin/policies',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title & Context */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Platform Administration Overview</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Real-time multi-tenant governance, security posture, and infrastructure monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>Security Engine:</span>
          <span className="font-mono text-emerald-400 font-medium">ONLINE (v2.4.0)</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              onClick={() => navigate(stat.path)}
              className="bg-bg-card border border-border-subtle hover:border-border-default rounded-xl p-5 shadow-lg cursor-pointer transition-all hover:translate-y-[-2px] group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text-muted">{stat.label}</span>
                <div className={`p-2 rounded-lg ${stat.bgColor} ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-text-primary mb-1">{stat.value}</div>
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>{stat.subtext}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-accent-blue" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Second Row: Organizations Quick View & Governance Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Managed Organizations Table */}
        <div className="lg:col-span-2">
          <AdminCard
            title="Managed Organizations & Tenants"
            subtitle="Multi-tenant tenant boundaries, tiers, and user allocations"
            icon={<Building2 className="w-4 h-4" />}
            action={
              <button
                onClick={() => navigate('/admin/organizations')}
                className="text-xs text-accent-blue hover:text-accent-cyan flex items-center gap-1 font-medium"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted">
                    <th className="pb-3 font-medium">Organization</th>
                    <th className="pb-3 font-medium">Type</th>
                    <th className="pb-3 font-medium">Plan Tier</th>
                    <th className="pb-3 font-medium">Active Users</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-text-secondary">
                  {organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-bg-elevated/40 transition-colors">
                      <td className="py-3">
                        <div className="font-semibold text-text-primary">{org.name}</div>
                        <div className="text-[11px] text-text-muted">{org.contact_email}</div>
                      </td>
                      <td className="py-3 capitalize font-mono text-[11px]">{org.org_type}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                          {org.plan_tier}
                        </span>
                      </td>
                      <td className="py-3 font-mono">{org.active_users_count} users</td>
                      <td className="py-3">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
        </div>

        {/* Quick Governance Links & Operational Status */}
        <div className="space-y-6">
          <AdminCard
            title="Operational Posture"
            subtitle="Platform security & compliance integrity"
            icon={<TrendingUp className="w-4 h-4" />}
          >
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-bg-elevated/60 border border-border-subtle">
                <span className="text-text-muted">Biometric Privacy Guard</span>
                <span className="text-emerald-400 font-medium">AES-256 (Masked)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-bg-elevated/60 border border-border-subtle">
                <span className="text-text-muted">Tenant Isolation Guard</span>
                <span className="text-emerald-400 font-medium">Enforced Strict</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-bg-elevated/60 border border-border-subtle">
                <span className="text-text-muted">Secret Credential Vault</span>
                <span className="text-accent-cyan font-medium">Masked (••••••••)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-bg-elevated/60 border border-border-subtle">
                <span className="text-text-muted">Audit Trail Immutability</span>
                <span className="text-purple-400 font-medium">Active SHA-256</span>
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Quick Management" icon={<FileCheck className="w-4 h-4" />}>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => navigate('/admin/policies')}
                className="p-3 text-left rounded-lg bg-bg-elevated/50 hover:bg-bg-elevated border border-border-subtle hover:border-border-default transition-all"
              >
                <div className="font-semibold text-text-primary mb-0.5">Policies</div>
                <div className="text-[11px] text-text-muted">Tuning & thresholds</div>
              </button>
              <button
                onClick={() => navigate('/admin/integrations')}
                className="p-3 text-left rounded-lg bg-bg-elevated/50 hover:bg-bg-elevated border border-border-subtle hover:border-border-default transition-all"
              >
                <div className="font-semibold text-text-primary mb-0.5">SIP & SMS</div>
                <div className="text-[11px] text-text-muted">Trunk diagnostics</div>
              </button>
              <button
                onClick={() => navigate('/admin/ai-services')}
                className="p-3 text-left rounded-lg bg-bg-elevated/50 hover:bg-bg-elevated border border-border-subtle hover:border-border-default transition-all"
              >
                <div className="font-semibold text-text-primary mb-0.5">AI Models</div>
                <div className="text-[11px] text-text-muted">Versions & rollback</div>
              </button>
              <button
                onClick={() => navigate('/admin/audit-logs')}
                className="p-3 text-left rounded-lg bg-bg-elevated/50 hover:bg-bg-elevated border border-border-subtle hover:border-border-default transition-all"
              >
                <div className="font-semibold text-text-primary mb-0.5">Audit Trail</div>
                <div className="text-[11px] text-text-muted">Admin action logs</div>
              </button>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
};

