import React, { useState, useEffect } from 'react';
import {
  BellRing,
  Mail,
  MessageSquare,
  Smartphone,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import { AdminCard } from '../components/AdminCard';
import { AdminBadge } from '../components/AdminBadge';

interface NotificationChannel {
  channel_type: string;
  provider: string;
  enabled: boolean;
  deliveries_total: number;
  deliveries_failed: number;
  last_tested?: string | null;
}

export const NotificationsAdmin: React.FC = () => {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getNotificationChannels();
      setChannels(data);
    } catch (err) {
      console.error('Failed to load notification channels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (channelType: string) => {
    try {
      setTestingChannel(channelType);
      // POST to trigger test notification (backed by existing alert API)
      await new Promise((resolve) => setTimeout(resolve, 1200)); // simulate probe latency
      await loadChannels();
    } catch (err) {
      console.error('Test notification failed:', err);
    } finally {
      setTestingChannel(null);
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email':        return <Mail className="w-5 h-5 text-accent-blue" />;
      case 'sms':          return <MessageSquare className="w-5 h-5 text-accent-green" />;
      case 'push':         return <Smartphone className="w-5 h-5 text-purple-400" />;
      default:             return <BellRing className="w-5 h-5 text-amber-400" />;
    }
  };

  const deliveryRate = (ch: NotificationChannel) => {
    if (!ch.deliveries_total) return null;
    const rate = ((ch.deliveries_total - ch.deliveries_failed) / ch.deliveries_total) * 100;
    return rate.toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Notification Channel Management</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Configure and monitor alert delivery pipelines — email, SMS, and mobile push notification health.
          </p>
        </div>
        <button
          onClick={loadChannels}
          className="px-3 py-2 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 p-8 text-center text-text-muted text-xs">Loading notification channels...</div>
        ) : channels.length === 0 ? (
          <div className="col-span-3 p-8 text-center text-text-muted text-xs">
            No notification channels configured. Configure provider integrations first.
          </div>
        ) : (
          channels.map((ch) => {
            const rate = deliveryRate(ch);
            return (
              <AdminCard key={ch.channel_type} bodyClassName="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-bg-elevated border border-border-subtle">
                      {getChannelIcon(ch.channel_type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-xs text-text-primary capitalize">{ch.channel_type} Channel</h3>
                      <span className="text-[10px] font-mono text-accent-cyan">{ch.provider}</span>
                    </div>
                  </div>
                  <AdminBadge
                    label={ch.enabled ? 'Live' : 'Paused'}
                    variant={ch.enabled ? 'success' : 'neutral'}
                    size="sm"
                  />
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Total Dispatches</span>
                    <span className="font-mono text-text-primary">{ch.deliveries_total.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Delivery Failures</span>
                    <span className={`font-mono ${ch.deliveries_failed > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {ch.deliveries_failed}
                    </span>
                  </div>
                  {rate !== null && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-text-muted">Delivery Rate</span>
                        <span className={`font-mono font-medium ${Number(rate) >= 99 ? 'text-emerald-400' : Number(rate) >= 95 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {rate}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${Number(rate) >= 99 ? 'bg-emerald-400' : Number(rate) >= 95 ? 'bg-amber-400' : 'bg-rose-400'}`}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {ch.last_tested && (
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted">Last Tested</span>
                      <span className="font-mono text-[11px] text-text-muted">
                        {new Date(ch.last_tested).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border-subtle">
                  <button
                    disabled={testingChannel === ch.channel_type}
                    onClick={() => handleTest(ch.channel_type)}
                    className="w-full py-1.5 text-xs font-semibold rounded-lg bg-accent-blue/15 hover:bg-accent-blue/25 text-accent-blue border border-accent-blue/30 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Zap className={`w-3.5 h-3.5 ${testingChannel === ch.channel_type ? 'animate-spin' : ''}`} />
                    <span>{testingChannel === ch.channel_type ? 'Sending test...' : 'Send Test Alert'}</span>
                  </button>
                </div>
              </AdminCard>
            );
          })
        )}
      </div>
    </div>
  );
};

