import { useState, useEffect, useRef } from 'react'
import {
  AreaChart, Area, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts'
import { PhoneOff, Mic, Volume2, Radio } from 'lucide-react'
import { SeverityBadge, RiskGauge, Waveform } from '../components/ui'
import { mockCalls, generateWaveformData } from '../data/mockData'
import { formatDuration, formatRelTime } from '../utils/ui'
import Topbar from '../components/Topbar'

export default function LiveCalls() {
  const [selectedCall, setSelectedCall] = useState(mockCalls[0])
  const [elapsed, setElapsed] = useState(0)
  const [waveData, setWaveData] = useState(generateWaveformData(60))
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed(e => e + 1)
      setWaveData(prev => {
        const next = [...prev.slice(1), {
          time: prev[prev.length - 1].time + 1,
          amplitude: Math.sin(Date.now() * 0.005) * 0.5 + Math.random() * 0.5,
          riskScore: Math.min(100, Math.max(0, selectedCall.riskScore + (Math.random() - 0.5) * 5)),
        }]
        return next
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [selectedCall])

  const totalElapsed = selectedCall.duration + elapsed

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Live Call Monitoring" subtitle="Real-time audio analysis and risk scoring" />

      <div className="flex flex-1 overflow-hidden">
        {/* Call list */}
        <div className="w-64 shrink-0 border-r border-border-subtle flex flex-col overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border-subtle flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary">Active Calls</span>
            <div className="flex items-center gap-1 text-xs text-accent-green font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-green animate-pulse inline-block" />
              {mockCalls.length}
            </div>
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-border-subtle/50">
            {mockCalls.map(call => (
              <button
                key={call.id}
                onClick={() => { setSelectedCall(call); setElapsed(0) }}
                className={`w-full text-left px-3 py-3 hover:bg-bg-elevated transition-colors
                  ${selectedCall.id === call.id ? 'bg-bg-elevated border-l-2 border-accent-blue' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-accent-blue">{call.callId}</span>
                  <SeverityBadge severity={call.severity} />
                </div>
                <p className="text-xs text-text-secondary truncate">{call.caller}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-text-muted font-mono">{formatDuration(call.duration)}</span>
                  <RiskGauge score={call.riskScore} size="sm" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Main call detail */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Call header */}
          <div className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-lg font-semibold text-text-primary font-mono">{selectedCall.callId}</h2>
                  <SeverityBadge severity={selectedCall.severity} className="text-sm" />
                  <span className="flex items-center gap-1.5 text-xs text-accent-green">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-green animate-pulse inline-block" />
                    LIVE
                  </span>
                </div>
                <p className="text-sm text-text-muted">{selectedCall.caller} → {selectedCall.target}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-danger text-xs">
                  <PhoneOff className="h-3.5 w-3.5" /> Terminate
                </button>
                <button className="btn btn-ghost text-xs">
                  <Volume2 className="h-3.5 w-3.5" /> Monitor
                </button>
              </div>
            </div>

            {/* Call stats strip */}
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[
                { label: 'Duration', value: formatDuration(totalElapsed), mono: true },
                { label: 'Risk Score', value: `${selectedCall.riskScore}%`, mono: true, danger: selectedCall.riskScore > 70 },
                { label: 'Status', value: selectedCall.status.toUpperCase(), mono: true },
                { label: 'Started', value: formatRelTime(selectedCall.startedAt) },
              ].map(s => (
                <div key={s.label} className="bg-bg-primary rounded-md px-3 py-2">
                  <p className="text-xs text-text-muted">{s.label}</p>
                  <p className={`text-sm font-semibold mt-0.5 ${s.mono ? 'font-mono' : ''} ${s.danger ? 'text-threat-critical' : 'text-text-primary'}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Waveform + risk score side by side */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-text-primary flex items-center gap-2">
                  <Waveform bars={8} active={true} />
                  Audio Waveform
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-accent-cyan font-mono">
                  <Radio className="h-3 w-3" /> Streaming
                </div>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={waveData}>
                  <defs>
                    <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="amplitude" stroke="#06b6d4" fill="url(#waveGrad)" strokeWidth={1.5} dot={false} />
                  <Tooltip contentStyle={{ background: '#13151c', border: '1px solid #252836', borderRadius: 6, fontSize: 11 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-4">
              <h3 className="text-xs font-semibold text-text-primary mb-3">Risk Score History</h3>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={waveData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} width={28} tickLine={false} />
                  <Line type="monotone" dataKey="riskScore" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Tooltip contentStyle={{ background: '#13151c', border: '1px solid #252836', borderRadius: 6, fontSize: 11 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Multilingual & Accent Detection (Phase 26) */}
          <div className="card p-4 border border-border-subtle bg-bg-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-text-primary flex items-center gap-2">
                <Mic className="h-3.5 w-3.5 text-accent-cyan" />
                Spoken Language & Regional Accent Profile
              </h3>
              <span className="text-[10px] font-mono font-semibold text-accent-green bg-accent-green/10 px-2 py-0.5 rounded border border-accent-green/20">
                FAIRNESS GUARD ACTIVE
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div className="bg-bg-primary rounded p-2.5 border border-border-subtle/50">
                <p className="text-[11px] text-text-muted">Primary Language</p>
                <p className="text-xs font-semibold text-text-primary font-mono mt-0.5">
                  Hindi (hi) <span className="text-accent-green text-[10px]">94% conf</span>
                </p>
              </div>
              <div className="bg-bg-primary rounded p-2.5 border border-border-subtle/50">
                <p className="text-[11px] text-text-muted">Code-Switching</p>
                <p className="text-xs font-semibold text-accent-purple font-mono mt-0.5">
                  Hinglish (Hindi + English)
                </p>
              </div>
              <div className="bg-bg-primary rounded p-2.5 border border-border-subtle/50">
                <p className="text-[11px] text-text-muted">Regional Accent</p>
                <p className="text-xs font-semibold text-text-secondary font-mono mt-0.5">
                  Gujarati-influenced English
                </p>
              </div>
            </div>
            <p className="text-[10px] text-text-muted italic border-t border-border-subtle/50 pt-2">
              Linguistic Fairness Notice: Regional pronunciation and dialect patterns are strictly descriptive. They do not penalize fraud risk scores.
            </p>
          </div>

          {/* Transcript snippet */}
          {selectedCall.transcriptSnippet && (
            <div className="card p-4">
              <h3 className="text-xs font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Mic className="h-3.5 w-3.5 text-accent-purple" />
                Live Transcript Snippet
              </h3>
              <p className="text-sm text-text-secondary italic leading-relaxed bg-bg-primary rounded-md px-3 py-2 border border-border-subtle font-mono">
                {selectedCall.transcriptSnippet}
              </p>
              <p className="text-xs text-text-muted mt-2">⚠️ Flagged: social engineering language pattern detected</p>
            </div>
          )}

          {/* AI Detection Panel */}
          <div className="card p-4">
            <h3 className="text-xs font-semibold text-text-primary mb-3">AI Detection Status</h3>
            <div className="space-y-2">
              {[
                { label: 'Voice Synthesis Detection', status: selectedCall.riskScore > 70 ? 'DETECTED' : 'CLEAR', risk: selectedCall.riskScore > 70 },
                { label: 'Speaker Impersonation', status: selectedCall.riskScore > 50 ? 'FLAGGED' : 'CLEAR', risk: selectedCall.riskScore > 50 },
                { label: 'Script Pattern Match', status: selectedCall.riskScore > 30 ? 'WARNING' : 'CLEAR', risk: selectedCall.riskScore > 30 },
                { label: 'Sentiment Analysis', status: 'URGENT TONE', risk: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-border-subtle/50 last:border-0">
                  <span className="text-xs text-text-secondary">{item.label}</span>
                  <span className={`text-xs font-mono font-semibold ${item.risk ? 'text-threat-high' : 'text-accent-green'}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-text-muted mt-3 italic">
              Note: AI detection models are not yet implemented. These are placeholder indicators for UI development.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
