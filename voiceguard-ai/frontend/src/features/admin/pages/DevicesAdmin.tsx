import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Laptop,
  Search,
  Bell,
  Trash2,
  RefreshCw,
  User,
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import type { DeviceAdminItem } from '../types';
import { AdminCard } from '../components/AdminCard';

export const DevicesAdmin: React.FC = () => {
  const [devices, setDevices] = useState<DeviceAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getDevices();
      setDevices(data);
    } catch (err) {
      console.error('Failed to load registered devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (device: DeviceAdminItem) => {
    if (
      !window.confirm(
        `Revoke access for device "${device.device_name || 'Unnamed'}" (${device.platform})? The user will be signed out.`
      )
    ) {
      return;
    }

    try {
      await adminApi.revokeDevice(device.id);
      await loadDevices();
    } catch (err: any) {
      alert(err?.message || 'Failed to revoke device registration');
    }
  };

  const filteredDevices = devices.filter((d) => {
    const matchesSearch =
      (d.device_name && d.device_name.toLowerCase().includes(search.toLowerCase())) ||
      (d.user_email && d.user_email.toLowerCase().includes(search.toLowerCase())) ||
      d.device_token.toLowerCase().includes(search.toLowerCase());
    const matchesPlatform = platformFilter === 'all' || d.platform.toLowerCase() === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  const getPlatformIcon = (platform: string) => {
    if (platform.toLowerCase() === 'windows' || platform.toLowerCase() === 'desktop') {
      return <Laptop className="w-4 h-4 text-accent-blue" />;
    }
    return <Smartphone className="w-4 h-4 text-purple-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Registered Endpoints & Devices</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Manage authenticated mobile and desktop client applications, push telemetry tokens, and hardware revocation.
          </p>
        </div>
        <button
          onClick={loadDevices}
          className="px-3 py-2 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by device name, owner email, or token hash..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue transition-colors"
          />
        </div>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="px-3 py-2 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
        >
          <option value="all">All Form Factors</option>
          <option value="ios">Apple iOS</option>
          <option value="android">Android</option>
          <option value="windows">Windows Console</option>
        </select>
      </div>

      {/* Devices Table */}
      <AdminCard bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-secondary/60 text-text-muted border-b border-border-subtle">
              <tr>
                <th className="py-3 px-4 font-semibold">Endpoint Device</th>
                <th className="py-3 px-4 font-semibold">Platform</th>
                <th className="py-3 px-4 font-semibold">Registered Owner</th>
                <th className="py-3 px-4 font-semibold">Push Gateway</th>
                <th className="py-3 px-4 font-semibold">Token Fingerprint</th>
                <th className="py-3 px-4 font-semibold">Registration Date</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-accent-blue" />
                      <span>Loading registered endpoints...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted">
                    No registered endpoints found.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((d) => (
                  <tr key={d.id} className="hover:bg-bg-elevated/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-bg-elevated border border-border-subtle">
                          {getPlatformIcon(d.platform)}
                        </div>
                        <div>
                          <div className="font-semibold text-text-primary">{d.device_name || 'Unnamed Device'}</div>
                          <div className="text-[10px] text-text-muted">ID: #{d.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] uppercase text-accent-cyan">
                      {d.platform}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-text-secondary">
                        <User className="w-3.5 h-3.5 text-text-muted" />
                        <span>{d.user_email || `User #${d.user_id}`}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {d.push_enabled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <Bell className="w-3.5 h-3.5" />
                          <span>Enabled</span>
                        </span>
                      ) : (
                        <span className="text-text-muted text-[11px]">Disabled</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-text-muted truncate max-w-xs">
                      {d.device_token}
                    </td>
                    <td className="py-3.5 px-4 text-text-muted font-mono text-[11px]">
                      {d.created_at ? new Date(d.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleRevoke(d)}
                        className="px-2.5 py-1 text-[11px] font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 rounded transition-colors inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Revoke</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
};

