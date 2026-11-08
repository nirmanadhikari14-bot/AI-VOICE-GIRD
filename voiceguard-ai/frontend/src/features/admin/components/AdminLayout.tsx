import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldAlert,
  Sliders,
  Mic2,
  Smartphone,
  Cpu,
  Radio,
  BellRing,
  History,
  FileText,
  Activity,
  Settings,
  Archive,
  ArrowLeft,
  ChevronDown,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Zap,
  Workflow,
} from 'lucide-react';
import clsx from 'clsx';
import { adminApi } from '../api/adminApi';
import type { OrganizationItem } from '../types';
import { useAuth } from '../../../context/AuthContext';

interface NavSection {
  title: string;
  items: {
    path: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Core Governance',
    items: [
      { path: '/admin', label: 'Overview', icon: LayoutDashboard },
      { path: '/admin/organizations', label: 'Organizations', icon: Building2 },
      { path: '/admin/users', label: 'Users & Accounts', icon: Users },
      { path: '/admin/roles', label: 'Roles & RBAC', icon: ShieldAlert },
    ],
  },
  {
    title: 'Security & Biometrics',
    items: [
      { path: '/admin/policies', label: 'Security Policies', icon: Sliders },
      { path: '/admin/voice-profiles', label: 'Voice Profiles', icon: Mic2 },
      { path: '/admin/devices', label: 'Registered Devices', icon: Smartphone },
      { path: '/admin/ai-services', label: 'AI Model Services', icon: Cpu },
      { path: '/admin/evaluations', label: 'Model Evaluation', icon: Activity },
    ],
  },
  {
    title: 'Integrations & Storage',
    items: [
      { path: '/admin/integration', label: 'Integration Layer', icon: Workflow },
      { path: '/admin/integrations', label: 'API Integrations', icon: Radio },
      { path: '/admin/notifications', label: 'Notification Channels', icon: BellRing },
      { path: '/admin/retention', label: 'Data Retention', icon: Archive },
      { path: '/admin/health', label: 'System Health', icon: Activity },
      { path: '/admin/performance', label: 'Performance & Latency', icon: Zap },
    ],
  },
  {
    title: 'Compliance & Audit',
    items: [
      { path: '/admin/audit-logs', label: 'Audit Trail', icon: History },
      { path: '/admin/reports', label: 'Compliance Reports', icon: FileText },
      { path: '/admin/settings', label: 'Platform Settings', icon: Settings },
    ],
  },
];

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const data = await adminApi.getOrganizations();
      setOrganizations(data);
      if (data.length > 0 && selectedOrgId === null) {
        // Default to first or user's org
        const userOrg = data.find((o) => o.id === (user as any)?.organization_id);
        setSelectedOrgId(userOrg ? userOrg.id : data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch organizations in AdminLayout:', err);
    }
  };

  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedOrgId(val ? Number(val) : null);
  };

  const activeOrg = organizations.find((o) => o.id === selectedOrgId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-primary text-text-primary">
      {/* Admin Sidebar */}
      <aside className="w-64 shrink-0 bg-bg-secondary border-r border-border-subtle flex flex-col h-full select-none">
        {/* Brand Header */}
        <div className="p-4 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-accent-blue/15 border border-accent-blue/30 text-accent-blue">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-wide text-text-primary">VoiceGuard</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-accent-blue/20 text-accent-blue border border-accent-blue/30">
                  Admin
                </span>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">Enterprise Governance</p>
            </div>
          </div>
        </div>

        {/* Organization Tenant Switcher */}
        <div className="px-3 py-3 border-b border-border-subtle bg-bg-card/40">
          <label className="text-[10px] uppercase tracking-wider text-text-muted font-medium block mb-1">
            Tenant Context
          </label>
          <div className="relative">
            <select
              value={selectedOrgId ?? ''}
              onChange={handleOrgChange}
              className="w-full text-xs font-medium bg-bg-elevated border border-border-subtle text-text-primary rounded-lg py-1.5 pl-2.5 pr-7 appearance-none focus:outline-none focus:border-accent-blue transition-colors cursor-pointer"
            >
              <option value="">All Organizations (Platform-wide)</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.plan_tier.toUpperCase()})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {activeOrg && (
            <div className="flex items-center justify-between mt-1.5 px-0.5">
              <span className="text-[10px] text-text-muted font-mono">{activeOrg.org_type}</span>
              <span className={clsx('text-[10px] font-medium capitalize', activeOrg.status === 'active' ? 'text-emerald-400' : 'text-amber-400')}>
                ● {activeOrg.status}
              </span>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-text-disabled uppercase">
                {section.title}
              </p>
              <nav className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive =
                    item.path === '/admin'
                      ? location.pathname === '/admin'
                      : location.pathname.startsWith(item.path);
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={clsx(
                        'flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                        isActive
                          ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30 shadow-sm'
                          : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated/60'
                      )}
                    >
                      <Icon className={clsx('w-4 h-4 shrink-0', isActive ? 'text-accent-blue' : 'text-text-muted')} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-border-subtle bg-bg-card/40 space-y-2">
          {/* Back to Ops Console */}
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary bg-bg-elevated hover:bg-bg-elevated/80 border border-border-subtle hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>SOC Operations Console</span>
          </button>

          {/* Admin User info & logout */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-6 h-6 rounded-full bg-accent-blue/20 border border-accent-blue/40 flex items-center justify-center text-xs text-accent-blue font-bold shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="overflow-hidden">
                <p className="text-[11px] font-medium text-text-primary truncate">{user?.email || 'admin@voiceguard.ai'}</p>
                <p className="text-[10px] text-text-muted capitalize">Security Administrator</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Administrative Viewport */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-14 shrink-0 border-b border-border-subtle bg-bg-secondary/60 backdrop-blur-md px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>Admin Portal</span>
              <span>/</span>
              <span className="text-text-primary font-medium capitalize">
                {location.pathname.replace('/admin/', '').replace('/admin', 'Overview').replace(/-/g, ' ')}
              </span>
            </div>
            {activeOrg && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-bg-elevated border border-border-subtle text-accent-cyan font-mono">
                Tenant: {activeOrg.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsRefreshing(true);
                setTimeout(() => setIsRefreshing(false), 600);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-bg-elevated rounded-lg border border-border-subtle hover:border-border-default transition-all"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', isRefreshing && 'animate-spin text-accent-blue')} />
              <span>Sync</span>
            </button>

            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium">Active Policy Engine</span>
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 overflow-y-auto p-6 bg-bg-primary">
          <Outlet context={{ selectedOrgId }} />
        </main>
      </div>
    </div>
  );
};

