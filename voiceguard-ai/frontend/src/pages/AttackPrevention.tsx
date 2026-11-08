import { useState } from 'react'
import { Shield, ShieldOff, Lock, Bell, Zap, Globe, Server } from 'lucide-react'
import { SeverityBadge } from '../components/ui'
import Topbar from '../components/Topbar'

interface Rule {
  id: string
  name: string
  description: string
  enabled: boolean
  triggerCount: number
  category: 'blocking' | 'alerting' | 'monitoring'
  severity: 'critical' | 'high' | 'medium' | 'low'
}

const RULES: Rule[] = [
  { id: 'r1', name: 'AI Voice Synthesis Blocker', description: 'Automatically terminate calls where AI-synthesized voice is detected with >90% confidence.', enabled: true, triggerCount: 5, category: 'blocking', severity: 'critical' },
  { id: 'r2', name: 'VoIP Anonymizer Block', description: 'Block calls routed through known anonymizer networks and Tor exit nodes.', enabled: true, triggerCount: 12, category: 'blocking', severity: 'high' },
  { id: 'r3', name: 'Social Engineering Pattern Alert', description: 'Alert SOC team when urgency-based social engineering scripts are detected.', enabled: true, triggerCount: 23, category: 'alerting', severity: 'high' },
  { id: 'r4', name: 'Impersonation Keyword Match', description: 'Detect and flag calls where caller claims to represent major institutions (banks, IRS, Microsoft).', enabled: true, triggerCount: 31, category: 'alerting', severity: 'medium' },
  { id: 'r5', name: 'Rapid Call Burst Detection', description: 'Alert when same caller ID places >5 calls within 10 minutes (smishing pattern).', enabled: false, triggerCount: 0, category: 'monitoring', severity: 'medium' },
  { id: 'r6', name: 'Unknown Speaker Quarantine', description: 'Auto-route calls from unregistered speaker profiles to a monitored queue.', enabled: true, triggerCount: 8, category: 'monitoring', severity: 'low' },
  { id: 'r7', name: 'Geographic Anomaly Alert', description: 'Flag calls where claimed location mismatches VoIP origin by >500km.', enabled: false, triggerCount: 0, category: 'alerting', severity: 'medium' },
]

const STATS = [
  { label: 'Calls Blocked Today', value: 17, icon: ShieldOff, color: 'text-threat-critical' },
  { label: 'Alerts Fired', value: 34, icon: Bell, color: 'text-threat-high' },
  { label: 'Active Rules', value: 5, icon: Shield, color: 'text-accent-blue' },
  { label: 'Prevention Rate', value: '94%', icon: Zap, color: 'text-accent-green' },
]

export default function AttackPrevention() {
  const [rules, setRules] = useState(RULES)

  const toggle = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  const categoryColor = (cat: Rule['category']) => {
    if (cat === 'blocking')   return 'text-threat-critical bg-red-900/20 border border-red-800/30'
    if (cat === 'alerting')   return 'text-threat-high bg-orange-900/20 border border-orange-800/30'
    return 'text-accent-blue bg-blue-900/20 border border-blue-800/30'
  }

  const categoryIcon = (cat: Rule['category']) => {
    if (cat === 'blocking')  return <Lock className="h-3 w-3" />
    if (cat === 'alerting')  return <Bell className="h-3 w-3" />
    return <Globe className="h-3 w-3" />
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Attack Prevention" subtitle="Active defense rules and threat mitigation controls" />

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {STATS.map(stat => (
            <div key={stat.label} className="card p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-bg-primary border border-border-subtle ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-semibold font-mono text-text-primary">{stat.value}</p>
                <p className="text-xs text-text-muted">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Threat map placeholder */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Globe className="h-4 w-4 text-accent-cyan" />
              Geographic Threat Origin Map
            </h2>
            <span className="text-xs text-text-muted">Last 24 hours</span>
          </div>
          <div className="h-40 bg-bg-primary rounded-lg border border-border-subtle flex items-center justify-center">
            <div className="text-center">
              <Globe className="h-8 w-8 text-text-disabled mx-auto mb-2" />
              <p className="text-xs text-text-muted">Threat map visualization</p>
              <p className="text-xs text-text-disabled">Requires geolocation API integration (Phase 11+)</p>
            </div>
          </div>
        </div>

        {/* Prevention Rules */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">Defense Rules</h2>
            <button className="btn btn-primary text-xs">
              <Shield className="h-3.5 w-3.5" /> Add Rule
            </button>
          </div>

          <div className="space-y-2">
            {rules.map(rule => (
              <div
                key={rule.id}
                className={`card p-4 transition-all ${rule.enabled ? '' : 'opacity-50'}`}
              >
                <div className="flex items-start gap-4">
                  {/* Toggle */}
                  <button
                    onClick={() => toggle(rule.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent
                                transition-colors duration-200 focus:outline-none mt-0.5
                                ${rule.enabled ? 'bg-accent-blue' : 'bg-border-strong'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200
                                  ${rule.enabled ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-medium text-text-primary">{rule.name}</h3>
                      <span className={`stat-badge text-xs flex items-center gap-1 ${categoryColor(rule.category)}`}>
                        {categoryIcon(rule.category)}
                        {rule.category}
                      </span>
                      <SeverityBadge severity={rule.severity} />
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">{rule.description}</p>
                  </div>

                  {/* Trigger count */}
                  <div className="text-right shrink-0">
                    <p className="text-lg font-semibold font-mono text-text-primary">{rule.triggerCount}</p>
                    <p className="text-xs text-text-muted">triggers</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System status */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
            <Server className="h-4 w-4 text-accent-purple" />
            Engine Status
          </h2>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
            {[
              { name: 'Audio Engine', status: 'Idle', ok: true },
              { name: 'AI Detection', status: 'Not Implemented', ok: false },
              { name: 'Risk Engine', status: 'Idle', ok: true },
              { name: 'Threat Intel', status: 'Idle', ok: true },
            ].map(s => (
              <div key={s.name} className="bg-bg-primary rounded-md px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-text-secondary">{s.name}</span>
                <span className={`text-xs font-mono ${s.ok ? 'text-accent-green' : 'text-text-muted'}`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
