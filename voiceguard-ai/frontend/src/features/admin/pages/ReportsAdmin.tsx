import React, { useState } from 'react';
import {
  FileText,
  Download,
  BarChart2,
  RefreshCw,
  Calendar,
  Building2,
  Shield,
  Users,
  Activity,
} from 'lucide-react';
import { adminApi } from '../api/adminApi';
import { AdminCard } from '../components/AdminCard';

interface ReportCategory {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    id: 'security_incidents',
    label: 'Security Incident Summary',
    description: 'Aggregated incident statistics by severity, resolution status, and tenant.',
    icon: Shield,
    color: 'text-rose-400',
  },
  {
    id: 'user_activity',
    label: 'User Activity Digest',
    description: 'Login patterns, API activity, role changes, and account lifecycle events.',
    icon: Users,
    color: 'text-accent-blue',
  },
  {
    id: 'compliance_audit',
    label: 'Compliance & Audit Posture',
    description: 'GDPR retention adherence, legal holds, biometric consent coverage, and audit completeness.',
    icon: FileText,
    color: 'text-emerald-400',
  },
  {
    id: 'risk_trends',
    label: 'Risk Score Trends',
    description: 'Historical risk distribution curves, detection accuracy deltas, and False Positive rates.',
    icon: BarChart2,
    color: 'text-amber-400',
  },
  {
    id: 'api_integration_health',
    label: 'API Integration Health Report',
    description: 'SIP trunk uptime, SMS delivery rate, push dispatch success, and provider SLA compliance.',
    icon: Activity,
    color: 'text-purple-400',
  },
  {
    id: 'tenant_benchmark',
    label: 'Tenant Benchmark Report',
    description: 'Cross-organization security posture comparison, alert volumes, and prevention efficacy.',
    icon: Building2,
    color: 'text-accent-cyan',
  },
];

export const ReportsAdmin: React.FC = () => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [reportData, setReportData] = useState<Record<string, any> | null>(null);

  const handleGenerate = async (categoryId: string) => {
    try {
      setGenerating(categoryId);
      setSelectedCategory(categoryId);
      setReportData(null);

      const data = await adminApi.generateReport({
        category: categoryId,
        start_date: dateRange.start || undefined,
        end_date: dateRange.end || undefined,
      });
      setReportData(data);
    } catch (err: any) {
      alert(err?.message || 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    const csv = JSON.stringify(reportData, null, 2);
    const blob = new Blob([csv], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voiceguard_report_${selectedCategory}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Compliance & Administrative Reporting</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Generate, preview, and export structured administrative reports for compliance, executive review, and regulatory submissions.
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2 text-xs shrink-0">
          <Calendar className="w-4 h-4 text-text-muted" />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="px-2 py-1.5 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
          />
          <span className="text-text-muted">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="px-2 py-1.5 bg-bg-card border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-accent-blue"
          />
        </div>
      </div>

      {/* Report Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;
          const isGenerating = generating === category.id;

          return (
            <AdminCard
              key={category.id}
              className={isSelected ? 'border-accent-blue/40 shadow-accent-blue/5 shadow-lg' : ''}
              bodyClassName="p-5 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`p-2 rounded-lg bg-bg-elevated border border-border-subtle ${category.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-xs text-text-primary">{category.label}</h3>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">{category.description}</p>
              </div>

              <button
                disabled={isGenerating}
                onClick={() => handleGenerate(category.id)}
                className={`w-full py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 border transition-colors ${
                  isSelected && !isGenerating
                    ? 'bg-accent-blue text-white border-accent-blue shadow-sm'
                    : 'bg-bg-elevated hover:bg-bg-elevated/80 text-text-secondary border-border-subtle hover:text-text-primary'
                } disabled:opacity-50`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>Generate Report</span>
                  </>
                )}
              </button>
            </AdminCard>
          );
        })}
      </div>

      {/* Report Data Output */}
      {reportData && (
        <AdminCard
          title={`Generated: ${REPORT_CATEGORIES.find((c) => c.id === selectedCategory)?.label}`}
          subtitle="Click Export to download as JSON for regulatory submissions"
          action={
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20 border border-accent-blue/30 rounded-lg"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          }
        >
          <pre className="p-4 rounded-lg bg-bg-elevated/60 border border-border-subtle text-[11px] font-mono text-text-secondary overflow-x-auto max-h-96">
            {JSON.stringify(reportData, null, 2)}
          </pre>
        </AdminCard>
      )}
    </div>
  );
};

