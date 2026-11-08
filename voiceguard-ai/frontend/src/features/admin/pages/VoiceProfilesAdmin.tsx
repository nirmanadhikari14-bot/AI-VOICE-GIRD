import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  Trash2,
  Lock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import type { VoiceProfileAdminItem } from '../types';
import { AdminCard } from '../components/AdminCard';
import { AdminBadge } from '../components/AdminBadge';

export const VoiceProfilesAdmin: React.FC = () => {
  const [profiles, setProfiles] = useState<VoiceProfileAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getVoiceProfiles();
      setProfiles(data);
    } catch (err) {
      console.error('Failed to load voice profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (profile: VoiceProfileAdminItem) => {
    if (
      !window.confirm(
        `Are you sure you want to revoke the biometric enrollment for "${profile.profile_name}" (${profile.speaker_id})? This will permanently invalidate their verification profile.`
      )
    ) {
      return;
    }

    try {
      await adminApi.revokeVoiceProfile(profile.id);
      await loadProfiles();
    } catch (err: any) {
      alert(err?.message || 'Failed to revoke voice profile');
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    return (
      p.profile_name.toLowerCase().includes(search.toLowerCase()) ||
      p.speaker_id.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Voice Biometrics Administration</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Manage authorized speaker enrollment baselines, consent records, and biometric verification parameters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadProfiles}
            className="px-3 py-2 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-xs text-accent-cyan flex items-start gap-3">
        <Lock className="w-5 h-5 shrink-0 text-accent-blue mt-0.5" />
        <div>
          <div className="font-semibold text-text-primary">Biometric Data Privacy Safeguards (GDPR / CCPA / BIPA)</div>
          <p className="text-text-secondary text-[11px] mt-0.5">
            VoiceGuard AI stores cryptographic embeddings in an encrypted vault. Raw acoustic audio features and 512-dimensional vector weights are never exposed to administrative interfaces or exported across tenant boundaries.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Search by profile name or speaker ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue transition-colors"
        />
      </div>

      {/* Profiles Table */}
      <AdminCard bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-secondary/60 text-text-muted border-b border-border-subtle">
              <tr>
                <th className="py-3 px-4 font-semibold">Speaker Identifier</th>
                <th className="py-3 px-4 font-semibold">Profile Name</th>
                <th className="py-3 px-4 font-semibold">Baseline Confidence</th>
                <th className="py-3 px-4 font-semibold">Sample Vectors</th>
                <th className="py-3 px-4 font-semibold">Consent Recorded</th>
                <th className="py-3 px-4 font-semibold">Verification Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-accent-blue" />
                      <span>Loading speaker profiles...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted">
                    No enrolled voice profiles found.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p) => (
                  <tr key={p.id} className="hover:bg-bg-elevated/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-accent-cyan">{p.speaker_id}</td>
                    <td className="py-3.5 px-4 font-semibold text-text-primary">{p.profile_name}</td>
                    <td className="py-3.5 px-4">
                      {p.baseline_confidence != null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-bg-elevated rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-400"
                              style={{ width: `${Math.round((p.baseline_confidence ?? 0) * 100)}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-text-secondary">
                            {((p.baseline_confidence ?? 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-text-muted text-[11px]">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-text-secondary">
                      {p.embedding_count} embeddings
                    </td>
                    <td className="py-3.5 px-4">
                      {p.consent_recorded ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Explicit Consent</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Pending</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <AdminBadge
                        label={p.verification_status}
                        variant={p.verification_status === 'verified' ? 'success' : 'warning'}
                        size="sm"
                      />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleRevoke(p)}
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

