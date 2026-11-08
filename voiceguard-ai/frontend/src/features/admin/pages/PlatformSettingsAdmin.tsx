import React, { useState, useEffect } from 'react';
import {
  Save,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import type { SystemConfigItem } from '../types';
import { AdminCard } from '../components/AdminCard';

export const PlatformSettingsAdmin: React.FC = () => {
  const [configs, setConfigs] = useState<SystemConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingValues, setEditingValues] = useState<Record<string, any>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successKey, setSuccessKey] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getSystemConfigs();
      setConfigs(data);
      const vals: Record<string, any> = {};
      data.forEach((c) => {
        vals[c.config_key] = typeof c.config_value === 'object' ? JSON.stringify(c.config_value, null, 2) : String(c.config_value);
      });
      setEditingValues(vals);
    } catch (err) {
      console.error('Failed to load system configs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (config: SystemConfigItem) => {
    try {
      setSavingKey(config.config_key);
      setSuccessKey(null);
      let parsedValue: any = editingValues[config.config_key];
      try {
        parsedValue = JSON.parse(parsedValue);
      } catch {
        // keep as string/primitive
      }

      await adminApi.updateSystemConfig({
        config_key: config.config_key,
        config_value: parsedValue,
        category: config.category,
      });

      setSuccessKey(config.config_key);
      setTimeout(() => setSuccessKey(null), 2500);
      await loadConfigs();
    } catch (err: any) {
      alert(err?.message || 'Failed to update system configuration');
    } finally {
      setSavingKey(null);
    }
  };

  // Group configs by category
  const categories = Array.from(new Set(configs.map((c) => c.category)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Platform Configuration & Parameters</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Configure system-wide runtime defaults, security thresholds, biometrics encryption modes, and telemetry settings.
          </p>
        </div>
        <button
          onClick={loadConfigs}
          className="px-3 py-2 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5 self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload Parameters</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-text-muted text-xs">Loading platform configurations...</div>
      ) : (
        <div className="space-y-6">
          {categories.map((category) => {
            const configsInCategory = configs.filter((c) => c.category === category);
            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-accent-blue uppercase tracking-wider font-mono">
                    [{category.toUpperCase()}]
                  </span>
                  <div className="h-px flex-1 bg-border-subtle" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {configsInCategory.map((item) => (
                    <AdminCard key={item.id} bodyClassName="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-xs text-text-primary font-mono">{item.config_key}</div>
                          <span className="text-[10px] text-text-muted capitalize">Scope: Platform-wide</span>
                        </div>
                        {item.is_secret && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                            SECRET
                          </span>
                        )}
                      </div>

                      <div>
                        {typeof item.config_value === 'object' ? (
                          <textarea
                            rows={3}
                            value={editingValues[item.config_key] ?? ''}
                            onChange={(e) =>
                              setEditingValues({ ...editingValues, [item.config_key]: e.target.value })
                            }
                            className="w-full p-2 font-mono text-xs bg-bg-elevated border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
                          />
                        ) : (
                          <input
                            type={item.is_secret ? 'password' : 'text'}
                            value={editingValues[item.config_key] ?? ''}
                            onChange={(e) =>
                              setEditingValues({ ...editingValues, [item.config_key]: e.target.value })
                            }
                            className="w-full px-3 py-1.5 font-mono text-xs bg-bg-elevated border border-border-subtle rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-text-muted">
                          {successKey === item.config_key ? (
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Saved successfully
                            </span>
                          ) : item.updated_at ? (
                            `Updated: ${new Date(item.updated_at).toLocaleDateString()}`
                          ) : (
                            'System Default'
                          )}
                        </span>

                        <button
                          disabled={savingKey === item.config_key}
                          onClick={() => handleSave(item)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-accent-blue hover:bg-accent-blue/90 text-white flex items-center gap-1 disabled:opacity-50 transition-colors shadow-sm"
                        >
                          <Save className="w-3 h-3" />
                          <span>{savingKey === item.config_key ? 'Saving...' : 'Save'}</span>
                        </button>
                      </div>
                    </AdminCard>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
