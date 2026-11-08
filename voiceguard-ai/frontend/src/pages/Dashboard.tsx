import { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts'
import { PhoneCall, AlertTriangle, Shield, Activity, TrendingUp, Zap } from 'lucide-react'
import { StatCard, SeverityBadge, RiskGauge, Waveform } from '../components/ui'
import { mockCalls, mockThreats, mockMetrics, generateThreatTimeline, generateWaveformData } from '../data/mockData'
import { formatDuration, formatRelTime } from '../utils/ui'
import Topbar from '../components/Topbar'

const threatTimeline = generateThreatTimeline()
const waveformData = generateWaveformData(80)

const METRIC_ICONS = [
  <PhoneCall className="h-4 w-4" />,
  <AlertTriangle className="h-4 w-4" />,
  <TrendingUp className="h-4 w-4" />,
  <Shield className="h-4 w-4" />,
  <Zap className="h-4 w-4" />,
  <Activity className="h-4 w-4" />,
]

export default function Dashboard() {
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null)
  const activeThreats = mockThreats.filter(t => !t.mitigated)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Security Operations Center" subtitle="VoiceGuard AI — Real-time Threat Monitoring" />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Critical alert banner */}
        {activeThreats.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-900/20 border border-red-700/50 rounded-lg animate-fade-in">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-threat-critical opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-threat-critical" />
            </span>
            <p className="text-sm text-threat-critical font-medium">
              {activeThreats.length} active threat{activeThreats.length > 1 ? 's' : ''} require immediate attention
            </p>
            <span className="ml-auto text-xs text-text-muted">
              Highest: {activeThreats[0]?.description.slice(0, 60)}...
            </span>
          </div>
        )}

        {/* Metrics row */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {mockMetrics.map((m, i) => (
            <StatCard
              key={m.label}
              label={m.label}
              value={m.value}
              unit={m.unit}
              delta={m.delta}
              trend={m.trend}
              icon={METRIC_ICONS[i]}
            />
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Threat timeline chart */}
          <div className="xl:col-span-2 card p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Threat Activity (24h)</h2>
                <p className="text-xs text-text-muted mt-0.5">Detections by severity over time</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={threatTimeline} barSize={4} barGap={1}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} interval={5} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={20} />
                <Tooltip
                  contentStyle={{ background: '#13151c', border: '1px solid #252836', borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="critical" stackId="a" fill="#ef4444" radius={[0,0,0,0]} />
                <Bar dataKey="high"     stackId="a" fill="#f97316" />
                <Bar dataKey="medium"   stackId="a" fill="#f59e0b" />
                <Bar dataKey="low"      stackId="a" fill="#10b981" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Risk score trend */}
          <div className="card p-4">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-text-primary">Risk Score Trend</h2>
              <p className="text-xs text-text-muted mt-0.5">Current call analysis</p>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={waveformData.slice(0, 40)}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
                <XAxis hide />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} width={28} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#13151c', border: '1px solid #252836', borderRadius: 6, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="riskScore" stroke="#3b82f6" fill="url(#riskGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active calls + threat feed */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Active Calls table */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <h2 className="text-sm font-semibold text-text-primary">Active Calls</h2>
              <div className="flex items-center gap-1.5 text-xs text-accent-green font-mono">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-green" />
                </span>
                Live
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Caller</th>
                    <th>Duration</th>
                    <th>Risk</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockCalls.map(call => (
                    <tr
                      key={call.id}
                      className={`cursor-pointer ${selectedCallId === call.id ? 'bg-bg-elevated/80' : ''}`}
                      onClick={() => setSelectedCallId(call.id === selectedCallId ? null : call.id)}
                    >
                      <td className="font-mono text-xs text-accent-blue">{call.callId}</td>
                      <td className="text-xs">{call.caller}</td>
                      <td className="font-mono text-xs">{formatDuration(call.duration)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <RiskGauge score={call.riskScore} size="sm" />
                        </div>
                      </td>
                      <td><SeverityBadge severity={call.severity} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Threat Feed */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <h2 className="text-sm font-semibold text-text-primary">Threat Feed</h2>
              <span className="text-xs text-text-muted">{mockThreats.length} events</span>
            </div>
            <div className="divide-y divide-border-subtle/50 overflow-y-auto max-h-72">
              {mockThreats.map(threat => (
                <div key={threat.id} className="flex gap-3 px-4 py-3 hover:bg-bg-elevated/40 transition-colors">
                  <div className="mt-0.5">
                    <SeverityBadge severity={threat.severity} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-text-primary capitalize">
                        {threat.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-mono text-text-muted">{threat.callId}</span>
                      {threat.mitigated && (
                        <span className="ml-auto text-xs text-accent-green flex items-center gap-1">
                          <Shield className="h-3 w-3" /> Mitigated
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed line-clamp-2">{threat.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-text-disabled font-mono">{formatRelTime(threat.timestamp)}</span>
                      <span className="text-xs text-text-muted">Confidence: {threat.confidence}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Waveform monitor strip */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Waveform bars={10} active={true} />
              Audio Analysis Monitor
            </h2>
            <span className="text-xs text-accent-blue font-mono">CALL-0x1A3F — LIVE</span>
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={waveformData}>
              <Line type="monotone" dataKey="amplitude" stroke="#06b6d4" strokeWidth={1.5} dot={false} />
              <Tooltip contentStyle={{ background: '#13151c', border: '1px solid #252836', borderRadius: 6, fontSize: 11 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
