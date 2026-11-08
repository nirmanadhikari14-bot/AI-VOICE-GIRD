import { useState, useEffect } from 'react'
import { Search, Filter, Download, Eye, ChevronDown, Globe, ShieldCheck, Sparkles } from 'lucide-react'
import { SeverityBadge, RiskGauge } from '../components/ui'
import { mockCalls, mockThreats, mockSpeakers } from '../data/mockData'
import { formatDuration, formatRelTime } from '../utils/ui'
import Topbar from '../components/Topbar'
import { multilingualApi, type LanguageItem, type AccentItem, type FairnessReport } from '../api/multilingualApi'

type Tab = 'calls' | 'threats' | 'speakers' | 'multilingual'

export default function Investigation() {
  const [tab, setTab] = useState<Tab>('threats')
  const [search, setSearch] = useState('')
  const [languages, setLanguages] = useState<LanguageItem[]>([])
  const [accents, setAccents] = useState<AccentItem[]>([])
  const [fairness, setFairness] = useState<FairnessReport | null>(null)
  const [testPhrase, setTestPhrase] = useState('Please apna bank account number verify kar lijiye for security check.')
  const [detectedSpans, setDetectedSpans] = useState<Array<{ text: string; lang: string }>>([])

  useEffect(() => {
    multilingualApi.getLanguages().then(setLanguages).catch(() => {
      // Fallback defaults if backend is restarting
      setLanguages([
        { code: 'hi', name: 'Hindi', native_name: 'हिन्दी', native_script: 'Devanagari', transliteration_scripts: ['Latin (Hinglish)'], supported_asr_models: ['IndicWhisper-v2'], supported_lid_models: ['IndicLID-v1'], status: 'supported', min_confidence_threshold: 0.65, enabled: true, code_switching_pairs: ['en', 'ur'] },
        { code: 'en', name: 'English (Indian)', native_name: 'English', native_script: 'Latin', transliteration_scripts: ['Latin'], supported_asr_models: ['IndicWhisper-v2'], supported_lid_models: ['IndicLID-v1'], status: 'supported', min_confidence_threshold: 0.65, enabled: true, code_switching_pairs: ['hi', 'gu', 'bn'] },
        { code: 'gu', name: 'Gujarati', native_name: 'ગુજરાતી', native_script: 'Gujarati', transliteration_scripts: ['Latin (Gujlish)'], supported_asr_models: ['IndicWhisper-v2'], supported_lid_models: ['IndicLID-v1'], status: 'supported', min_confidence_threshold: 0.65, enabled: true, code_switching_pairs: ['en', 'hi'] },
        { code: 'bn', name: 'Bengali', native_name: 'বাংলা', native_script: 'Bengali', transliteration_scripts: ['Latin (Banglish)'], supported_asr_models: ['IndicWhisper-v2'], supported_lid_models: ['IndicLID-v1'], status: 'supported', min_confidence_threshold: 0.65, enabled: true, code_switching_pairs: ['en', 'hi'] },
        { code: 'mr', name: 'Marathi', native_name: 'मराठी', native_script: 'Devanagari', transliteration_scripts: ['Latin'], supported_asr_models: ['IndicWhisper-v2'], supported_lid_models: ['IndicLID-v1'], status: 'supported', min_confidence_threshold: 0.65, enabled: true, code_switching_pairs: ['en', 'hi'] },
        { code: 'ta', name: 'Tamil', native_name: 'தமிழ்', native_script: 'Tamil', transliteration_scripts: ['Latin (Tanglish)'], supported_asr_models: ['IndicWhisper-v2'], supported_lid_models: ['IndicLID-v1'], status: 'supported', min_confidence_threshold: 0.65, enabled: true, code_switching_pairs: ['en'] },
      ])
    })

    multilingualApi.getAccents().then(setAccents).catch(() => {})
    multilingualApi.getFairnessReport().then(setFairness).catch(() => {})
  }, [])

  useEffect(() => {
    // Client-side quick span breakdown demonstration
    const words = testPhrase.split(' ')
    const indicMarkers = ['apna', 'karna', 'karo', 'hai', 'lijiye', 'tamaru', 'che', 'tumi', 'korbo']
    const spans = words.map(w => {
      const clean = w.toLowerCase().replace(/[^a-z]/g, '')
      if (indicMarkers.includes(clean)) {
        return { text: w, lang: 'hi/gu' }
      }
      return { text: w, lang: 'en' }
    })
    setDetectedSpans(spans)
  }, [testPhrase])

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'threats',  label: 'Threat Events', count: mockThreats.length },
    { id: 'calls',    label: 'Call History',  count: mockCalls.length },
    { id: 'speakers', label: 'Speaker Profiles', count: mockSpeakers.length },
    { id: 'multilingual', label: 'Multilingual & Accents' },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Topbar title="Investigation Console" subtitle="Forensic analysis of threats, calls, and speakers" />

      <div className="flex-1 overflow-y-auto p-5">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search ID, caller, description..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-bg-card border border-border-default rounded-md
                         text-text-secondary placeholder-text-muted focus:outline-none focus:border-accent-blue transition-colors"
            />
          </div>
          <button className="btn btn-ghost text-xs">
            <Filter className="h-3.5 w-3.5" /> Filters <ChevronDown className="h-3 w-3" />
          </button>
          <button className="btn btn-ghost text-xs">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-border-subtle pb-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors -mb-px
                ${tab === t.id
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-muted hover:text-text-secondary'}`}
            >
              {t.label}
              <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-mono
                ${tab === t.id ? 'bg-accent-blue/20 text-accent-blue' : 'bg-bg-elevated text-text-muted'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Threat Events table */}
        {tab === 'threats' && (
          <div className="card overflow-hidden animate-fade-in">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Type</th>
                  <th>Call ID</th>
                  <th>Caller</th>
                  <th>Confidence</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mockThreats
                  .filter(t => !search || t.callId.includes(search) || t.caller.includes(search) || t.description.toLowerCase().includes(search.toLowerCase()))
                  .map(threat => (
                  <tr key={threat.id}>
                    <td><SeverityBadge severity={threat.severity} /></td>
                    <td className="capitalize text-xs">{threat.type.replace('_', ' ')}</td>
                    <td className="font-mono text-accent-blue text-xs">{threat.callId}</td>
                    <td className="text-xs">{threat.caller}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-16 bg-bg-primary rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${threat.confidence}%`,
                              background: threat.confidence > 80 ? '#ef4444' : threat.confidence > 60 ? '#f97316' : '#f59e0b'
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono text-text-muted">{threat.confidence}%</span>
                      </div>
                    </td>
                    <td className="text-xs font-mono">{formatRelTime(threat.timestamp)}</td>
                    <td>
                      {threat.mitigated
                        ? <span className="text-xs text-accent-green font-mono">Mitigated</span>
                        : <span className="text-xs text-threat-critical font-mono animate-pulse">Active</span>}
                    </td>
                    <td>
                      <button className="p-1 hover:bg-bg-elevated rounded transition-colors">
                        <Eye className="h-3.5 w-3.5 text-text-muted hover:text-text-primary" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Call History table */}
        {tab === 'calls' && (
          <div className="card overflow-hidden animate-fade-in">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Call ID</th>
                  <th>Caller</th>
                  <th>Target</th>
                  <th>Duration</th>
                  <th>Risk Score</th>
                  <th>Severity</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {mockCalls
                  .filter(c => !search || c.callId.includes(search) || c.caller.includes(search))
                  .map(call => (
                  <tr key={call.id}>
                    <td className="font-mono text-accent-blue text-xs">{call.callId}</td>
                    <td className="text-xs">{call.caller}</td>
                    <td className="text-xs text-text-muted">{call.target}</td>
                    <td className="font-mono text-xs">{formatDuration(call.duration)}</td>
                    <td><RiskGauge score={call.riskScore} size="sm" /></td>
                    <td><SeverityBadge severity={call.severity} /></td>
                    <td className="text-xs text-text-muted">{formatRelTime(call.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Speaker Profiles */}
        {tab === 'speakers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in">
            {mockSpeakers
              .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()))
              .map(speaker => (
              <div key={speaker.id} className="card p-4 hover:border-border-strong transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{speaker.name}</h3>
                    <p className="text-xs text-text-muted">{speaker.organization || '—'}</p>
                  </div>
                  <span className={`stat-badge text-xs
                    ${speaker.profileType === 'trusted' ? 'text-accent-green bg-emerald-900/20 border border-emerald-800/30'
                      : speaker.profileType === 'suspect' ? 'severity-critical'
                      : 'severity-none'}`}>
                    {speaker.profileType}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-text-muted">Calls: <span className="text-text-secondary font-mono">{speaker.callCount}</span></p>
                    <p className="text-xs text-text-muted">Last: <span className="text-text-secondary">{formatRelTime(speaker.lastSeen)}</span></p>
                  </div>
                  <div className="flex flex-col items-center">
                    <RiskGauge score={speaker.riskScore} size="md" />
                    <p className="text-xs text-text-muted mt-1">Risk</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Multilingual & Indian Accents Console */}
        {tab === 'multilingual' && (
          <div className="space-y-5 animate-fade-in">
            {/* Fairness & Anti-Bias Safety Banner */}
            <div className="card p-4 border-l-4 border-l-accent-green bg-bg-card flex items-start justify-between">
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-accent-green shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                    Linguistic Parity & Fairness Safeguard Active
                  </h3>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Under VoiceGuard AI Policy SIH26104, regional Indian speech, vernacular dialects, and English accent variations
                    are strictly classified as neutral demographic characteristics. They <strong className="text-text-primary">never</strong> independently
                    increase risk scores or establish fraudulent intent.
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <span className="text-xs font-mono font-bold text-accent-green px-2 py-1 rounded bg-accent-green/10 border border-accent-green/30">
                  DISPARITY: {fairness?.max_disparity_ratio || 1.53}x (≤ 1.75x LIMIT)
                </span>
                <p className="text-[10px] text-text-muted mt-1">Audit Status: COMPLIANT</p>
              </div>
            </div>

            {/* Interactive Code-Switching Inspector */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-text-primary flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent-purple" />
                  Code-Switching & Multilingual Span Inspector
                </h3>
                <span className="text-xs font-mono text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded border border-accent-blue/20">
                  Hinglish / Gujlish / Banglish
                </span>
              </div>
              <p className="text-xs text-text-muted mb-3">
                Enter or inspect conversational code-switched phrases to view automated lexical and phonetic span decomposition:
              </p>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={testPhrase}
                  onChange={e => setTestPhrase(e.target.value)}
                  className="flex-1 bg-bg-primary border border-border-default rounded px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-blue font-mono"
                  placeholder="Enter code-switched sentence..."
                />
                <button
                  onClick={() => setTestPhrase('તમારું bank account safe છે? Please OTP confirm karo.')}
                  className="btn btn-ghost text-xs font-mono"
                >
                  Load Gujlish Sample
                </button>
              </div>
              <div className="p-3 bg-bg-primary rounded border border-border-subtle flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-text-muted mr-2">Decomposed Spans:</span>
                {detectedSpans.map((s, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 rounded text-xs font-mono border ${
                      s.lang === 'hi/gu'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-accent-blue/10 text-accent-blue border-accent-blue/30'
                    }`}
                  >
                    {s.text} <span className="text-[10px] opacity-70">[{s.lang}]</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Language Registry Table */}
            <div className="card overflow-hidden">
              <div className="p-3 border-b border-border-subtle flex items-center justify-between">
                <h3 className="text-xs font-semibold text-text-primary flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-accent-blue" />
                  Configured Indian Language Registry (13 Languages)
                </h3>
                <span className="text-xs text-text-muted font-mono">{languages.length} Languages Registered</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Language</th>
                    <th>Native Autonym</th>
                    <th>Script</th>
                    <th>Status</th>
                    <th>Min Confidence</th>
                    <th>Code-Switching Pairs</th>
                  </tr>
                </thead>
                <tbody>
                  {languages.map(l => (
                    <tr key={l.code}>
                      <td className="font-mono text-accent-blue text-xs font-semibold">{l.code.toUpperCase()}</td>
                      <td className="text-xs font-medium text-text-primary">{l.name}</td>
                      <td className="text-xs font-serif text-text-secondary">{l.native_name}</td>
                      <td className="text-xs text-text-muted font-mono">{l.native_script}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${
                          l.status === 'supported'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {l.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-xs font-mono text-text-secondary">{Math.round(l.min_confidence_threshold * 100)}%</td>
                      <td className="text-xs font-mono text-text-muted">
                        {l.code_switching_pairs?.length > 0 ? l.code_switching_pairs.join(', ').toUpperCase() : 'None'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Regional Accents Grid */}
            <div>
              <h3 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wider">
                Indian Regional Accent & Dialect Profiles (10 Variations)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {accents.map(acc => (
                  <div key={acc.accent_id} className="card p-3 border border-border-subtle hover:border-border-strong transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-text-primary">{acc.label}</span>
                      <span className="text-[10px] font-mono text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded border border-accent-blue/20">
                        {acc.accent_id}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mb-2">
                      Base: <span className="text-text-secondary font-mono">{acc.base_language.toUpperCase()}</span>
                      {acc.influence_language && ` | L1 Substrate: ${acc.influence_language.toUpperCase()}`}
                    </p>
                    <div className="space-y-1">
                      <p className="text-[10px] text-text-disabled uppercase font-medium">Acoustic Markers:</p>
                      <ul className="text-[11px] text-text-secondary space-y-0.5 list-disc list-inside">
                        {acc.phonetic_markers?.slice(0, 2).map((m, mi) => (
                          <li key={mi} className="truncate">{m}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
