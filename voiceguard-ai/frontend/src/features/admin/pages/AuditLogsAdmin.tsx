import React, { useState, useEffect } from 'react';
import {
  Search,
  Download,
  RefreshCw,
  Info,
  User,
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import type { AdminAuditLogItem } from '../types';
import { AdminCard } from '../components/AdminCard';
import { AdminModal } from '../components/AdminModal';

export const AuditLogsAdmin: React.FC = () => {
  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AdminAuditLogItem | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Timestamp', 'Admin Email', 'Action', 'Resource Type', 'Resource ID', 'IP Address'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.created_at || '',
      l.user_email || '',
      l.action,
      l.resource_type,
      l.resource_id || '',
      l.ip_address || '',
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voiceguard_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.user_email && log.user_email.toLowerCase().includes(search.toLowerCase())) ||
      log.resource_type.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('revoke') || action.includes('suspend'))
      return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (action.includes('create') || action.includes('activate'))
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (action.includes('update') || action.includes('modify') || action.includes('configure'))
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Immutable Administrative Audit Trail</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Full-fidelity, tamper-evident record of all platform governance actions for compliance, forensic investigation, and SOX/SOC 2 audit export.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3.5 py-2 bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue rounded-lg text-xs font-semibold border border-accent-blue/30 transition-colors shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Filter by action, administrator email, or resource type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue transition-colors"
          />
        </div>
        <button
          onClick={loadLogs}
          className="px-3 py-2 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-secondary hover:text-text-primary flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload</span>
        </button>
      </div>

      {/* Audit Log Table */}
      <AdminCard bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bg-secondary/60 text-text-muted border-b border-border-subtle">
              <tr>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Administrator</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Resource</th>
                <th className="py-3 px-4 font-semibold">IP Address</th>
                <th className="py-3 px-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-accent-blue" />
                      <span>Loading audit trail...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">No audit records matching criteria.</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-bg-elevated/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-text-muted whitespace-nowrap">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-text-muted" />
                        <span className="font-mono text-[11px] text-text-secondary">
                          {log.user_email || `User #${log.user_id}`}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getActionColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[11px] text-text-secondary">
                        <span className="font-semibold">{log.resource_type}</span>
                        {log.resource_id && (
                          <span className="text-text-muted font-mono"> #{log.resource_id}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-text-muted">
                      {log.ip_address || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {log.details && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2 py-1 text-[11px] text-sky-400 hover:bg-sky-500/10 border border-sky-500/20 rounded transition-colors inline-flex items-center gap-1"
                        >
                          <Info className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredLogs.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
            <span>Showing {filteredLogs.length} of {logs.length} records</span>
            <span className="font-mono">Immutable • SHA-256 Chained</span>
          </div>
        )}
      </AdminCard>

      {/* Details Modal */}
      <AdminModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Audit Log Record Details"
        description={`Action: ${selectedLog?.action} — ${selectedLog?.created_at ? new Date(selectedLog.created_at).toLocaleString() : ''}`}
        size="md"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-text-muted text-[10px] uppercase tracking-wider mb-1">Administrator</div>
                <div className="font-mono text-text-primary">{selectedLog.user_email || `#${selectedLog.user_id}`}</div>
              </div>
              <div>
                <div className="text-text-muted text-[10px] uppercase tracking-wider mb-1">IP Address</div>
                <div className="font-mono text-text-primary">{selectedLog.ip_address || '—'}</div>
              </div>
              <div>
                <div className="text-text-muted text-[10px] uppercase tracking-wider mb-1">Resource Type</div>
                <div className="font-mono text-text-primary">{selectedLog.resource_type}</div>
              </div>
              <div>
                <div className="text-text-muted text-[10px] uppercase tracking-wider mb-1">Resource ID</div>
                <div className="font-mono text-text-primary">{selectedLog.resource_id || '—'}</div>
              </div>
            </div>

            <div>
              <div className="text-text-muted text-[10px] uppercase tracking-wider mb-2">Structured Payload</div>
              <pre className="p-3 rounded-lg bg-bg-elevated border border-border-subtle text-[11px] font-mono text-text-secondary overflow-x-auto max-h-64">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
};

