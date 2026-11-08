// VoiceGuard AI — Integration Orchestrator Admin Console
// Phase 29: Integration Layer (SIH26104)

import { useState, useEffect } from 'react';
import {
  Workflow,
  Shield,
  Activity,
  AlertTriangle,
  Play,
  RotateCw,
  Clock,
  Layers,
  Cpu,
  UserCheck,
  Languages,
  Mic,
  MessageSquare,
  Radio,
  FileText,
} from 'lucide-react';
import {
  integrationApi,
  type UnifiedAnalysisResponse,
  type AnalysisSessionSummary,
  type IntegrationEventItem,
} from '../../../api/integrationApi';

export function IntegrationOrchestratorAdmin() {
  const [activeTab, setActiveTab] = useState<'orchestrator' | 'sessions' | 'events'>('orchestrator');
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [sessions, setSessions] = useState<AnalysisSessionSummary[]>([]);
  const [events, setEvents] = useState<IntegrationEventItem[]>([]);
  const [selectedResult, setSelectedResult] = useState<UnifiedAnalysisResponse | null>(null);
  const [activePreset, setActivePreset] = useState<'genuine' | 'synthetic' | 'mismatch' | 'multilingual' | 'social_eng'>('synthetic');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await integrationApi.listSessions();
      setSessions(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const data = await integrationApi.listEvents(30);
      setEvents(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchEvents();
  }, []);

  const handleRunPreset = async () => {
    setExecuting(true);
    setMessage(null);
    try {
      let overrides: Record<string, any> = {};
      let callerNum = "+919876543210";
      let targetId = "rahul.sharma";

      if (activePreset === 'synthetic') {
        overrides = {
          override_authenticity: {
            score: 96.5,
            confidence: 0.98,
            features: { vocoder_artifacts: "hifi_gan_markers", pitch_jitter: 0.003, phase_discontinuity_rate: 0.089 },
          },
          override_speaker: { similarity: 0.42, verified: false, target_identity: "rahul.sharma" },
          override_threat: { threat_score: 94.0, matched: true, threat_actor: "DB-774-VOICE-IMPERSONATOR" },
        };
        callerNum = "+1800-SPOOFED-DESK";
      } else if (activePreset === 'genuine') {
        overrides = {
          override_authenticity: { score: 11.2, confidence: 0.94 },
          override_speaker: { similarity: 0.92, verified: true, target_identity: "rahul.sharma" },
          override_threat: { threat_score: 8.0, matched: false },
        };
      } else if (activePreset === 'mismatch') {
        overrides = {
          override_authenticity: { score: 18.0, confidence: 0.91 },
          override_speaker: { similarity: 0.38, verified: false, target_identity: "authorized_cfo" },
        };
      } else if (activePreset === 'multilingual') {
        overrides = {
          override_language: { language_code: "hi", confidence: 0.96, detected_accent: "in_hindi_general", is_code_switched: true, code_switching_ratio: 0.42 },
          override_authenticity: { score: 14.5, confidence: 0.92 },
          override_speaker: { similarity: 0.89, verified: true, target_identity: "priya_patel" },
        };
      } else if (activePreset === 'social_eng') {
        overrides = {
          override_nlp: { social_engineering_score: 88.0, urgency_score: 0.94, matched_patterns: ["urgency_wire", "coercion_cfo"] },
          override_authenticity: { score: 72.0, confidence: 0.88 },
        };
      }

      const res = await integrationApi.triggerAnalysis({
        analysis_profile: "standard_defense",
        caller_number: callerNum,
        target_identity: targetId,
        consent_confirmed: true,
        context_overrides: overrides,
      });

      setSelectedResult(res);
      setMessage({ type: 'success', text: `Orchestrator completed analysis (${res.analysis_id}) in ${res.processing_metadata?.total_processing_time_ms || 0}ms.` });
      fetchSessions();
      fetchEvents();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Execution failed' });
    } finally {
      setExecuting(false);
    }
  };

  const handleInspectSession = async (analysisId: string) => {
    try {
      setLoading(true);
      const res = await integrationApi.getResults(analysisId);
      setSelectedResult(res);
      setActiveTab('orchestrator');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Workflow className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Integration Layer & Orchestrator</h1>
              <p className="text-sm text-gray-400">
                Phase 29 — Coordinated Multi-Engine Architecture & Standardized Lifecycle
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchSessions(); fetchEvents(); }}
            className="p-2 text-gray-400 hover:text-white rounded-lg bg-gray-900 border border-gray-800 transition-colors"
            title="Refresh state"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1 text-sm font-medium">
            <button
              onClick={() => setActiveTab('orchestrator')}
              className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === 'orchestrator' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Live Orchestrator
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === 'sessions' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Sessions ({sessions.length})
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`px-3 py-1.5 rounded-md transition-colors ${activeTab === 'events' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Event Bus ({events.length})
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
          message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
          message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-300' :
          'bg-blue-500/10 border-blue-500/20 text-blue-300'
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs opacity-75 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Main Tab: Orchestrator */}
      {activeTab === 'orchestrator' && (
        <div className="space-y-6">
          {/* Preset Runner Card */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Play className="w-4 h-4 text-orange-400" />
                  Trigger Unified Analysis Pipeline
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Dispatches audio through all 8 integrated engines, Central Risk Evaluator, XAI dossier, and policy engine.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(['synthetic', 'genuine', 'mismatch', 'multilingual', 'social_eng'] as const).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setActivePreset(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      activePreset === preset
                        ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                        : 'bg-gray-800/60 border-gray-700/60 text-gray-400 hover:text-white'
                    }`}
                  >
                    {preset === 'synthetic' && '🚨 Synthetic Attack'}
                    {preset === 'genuine' && '✅ Genuine Call'}
                    {preset === 'mismatch' && '👤 Speaker Mismatch'}
                    {preset === 'multilingual' && '🌐 Multilingual Code-Switch'}
                    {preset === 'social_eng' && '⚠️ Social Engineering'}
                  </button>
                ))}

                <button
                  onClick={handleRunPreset}
                  disabled={executing}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-lg shadow-orange-500/20 transition-all"
                >
                  <Play className={`w-3.5 h-3.5 ${executing ? 'animate-spin' : ''}`} />
                  {executing ? 'Executing...' : 'Run Analysis'}
                </button>
              </div>
            </div>
          </div>

          {/* Logical Pipeline Architecture Ribbon */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { title: '1. Ingestion', desc: 'Canonical 16kHz', icon: Mic },
              { title: '2. Authenticity', desc: 'Conformer Vocoder', icon: Cpu },
              { title: '3. Speaker ID', desc: 'ECAPA-TDNN 192d', icon: UserCheck },
              { title: '4. Prosody', desc: 'F0 Jitter & Cadence', icon: Activity },
              { title: '5. Multilingual', desc: '13 Languages + CS', icon: Languages },
              { title: '6. NLP Social', desc: 'Urgency & Coercion', icon: MessageSquare },
              { title: '7. Central Risk', desc: 'Phase 17 Evaluator', icon: Shield },
              { title: '8. Response', desc: 'Alert & Prevention', icon: AlertTriangle },
            ].map((step, idx) => {
              const IconComp = step.icon;
              return (
                <div key={idx} className="bg-gray-900/40 border border-gray-800/80 rounded-xl p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <IconComp className="w-4 h-4 text-orange-400/80" />
                    <span>#{idx + 1}</span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-medium text-white truncate">{step.title}</div>
                    <div className="text-[10px] text-gray-400 truncate">{step.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Results Display */}
          {selectedResult ? (
            <div className="space-y-6">
              {/* Top Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
                  <div className="text-xs font-medium text-gray-400">Overall Risk Score</div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className={`text-3xl font-extrabold ${
                      (selectedResult.risk_assessment?.overall_score || 0) >= 80 ? 'text-red-400' :
                      (selectedResult.risk_assessment?.overall_score || 0) >= 50 ? 'text-orange-400' :
                      'text-emerald-400'
                    }`}>
                      {selectedResult.risk_assessment?.overall_score?.toFixed(1) || '0.0'}
                    </span>
                    <span className="text-xs text-gray-500">/ 100</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedResult.risk_assessment?.risk_level === 'critical' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                      selectedResult.risk_assessment?.risk_level === 'high' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {selectedResult.risk_assessment?.risk_level || 'UNKNOWN'}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Conf: {((selectedResult.risk_assessment?.confidence || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
                  <div className="text-xs font-medium text-gray-400">Authenticity Verdict</div>
                  <div className="text-xl font-bold text-white mt-2">
                    {selectedResult.authenticity_result?.verdict || 'AUTHENTIC'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Synthetic likelihood: {selectedResult.authenticity_result?.synthetic_voice_score || 0}%
                  </div>
                  <div className="mt-3 text-[11px] text-gray-500 truncate">
                    Model: {selectedResult.authenticity_result?.model_name || 'Conformer-v2.4'}
                  </div>
                </div>

                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
                  <div className="text-xs font-medium text-gray-400">Speaker Verification</div>
                  <div className={`text-xl font-bold mt-2 ${selectedResult.speaker_verification_result?.verified ? 'text-emerald-400' : 'text-red-400'}`}>
                    {selectedResult.speaker_verification_result?.verified ? 'VERIFIED MATCH' : 'MISMATCH DETECTED'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Similarity: {((selectedResult.speaker_verification_result?.similarity || 0) * 100).toFixed(1)}%
                  </div>
                  <div className="mt-3 text-[11px] text-gray-500 truncate">
                    Target: {selectedResult.speaker_verification_result?.target_identity || 'N/A'}
                  </div>
                </div>

                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
                  <div className="text-xs font-medium text-gray-400">Total Latency</div>
                  <div className="text-3xl font-extrabold text-white mt-2">
                    {selectedResult.processing_metadata?.total_processing_time_ms || 0}
                    <span className="text-xs text-gray-500 font-normal ml-1">ms</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Status: <span className="text-emerald-400 font-semibold">{selectedResult.processing_status}</span>
                  </div>
                  <div className="mt-3 text-[11px] text-gray-500 truncate">
                    Session: {selectedResult.analysis_id}
                  </div>
                </div>
              </div>

              {/* Multi-Signal Breakdown */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                  <Layers className="w-4 h-4 text-orange-400" />
                  Multi-Signal Weighted Risk Breakdown (Phase 17 Central Risk Engine)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'Voice Authenticity (35%)', score: selectedResult.risk_assessment?.scores?.voice || 0 },
                    { label: 'Speaker Biometrics (25%)', score: selectedResult.risk_assessment?.scores?.speaker || 0 },
                    { label: 'NLP / Urgency (15%)', score: selectedResult.risk_assessment?.scores?.conversation || 0 },
                    { label: 'Threat Intel (10%)', score: selectedResult.risk_assessment?.scores?.threat || 0 },
                    { label: 'Caller / Telephony (10%)', score: selectedResult.risk_assessment?.scores?.caller || 0 },
                    { label: 'Transaction (5%)', score: selectedResult.risk_assessment?.scores?.transaction || 0 },
                  ].map((sig, idx) => (
                    <div key={idx} className="bg-gray-800/40 rounded-xl p-3 border border-gray-800">
                      <div className="text-[11px] text-gray-400 truncate">{sig.label}</div>
                      <div className="text-lg font-bold text-white mt-1">{sig.score.toFixed(1)}</div>
                      <div className="w-full bg-gray-700/50 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${sig.score >= 70 ? 'bg-red-500' : sig.score >= 40 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, sig.score)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Explainable AI Dossier & Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-400" />
                    Observed Forensic Evidence & Conclusions
                  </h3>
                  <div className="space-y-2">
                    {selectedResult.explanation?.observed_evidence?.map((item, idx) => (
                      <div key={idx} className="text-xs text-gray-300 bg-gray-800/30 p-2.5 rounded-lg border border-gray-800">
                        • {item}
                      </div>
                    ))}
                    {selectedResult.explanation?.model_conclusions?.map((item, idx) => (
                      <div key={idx} className="text-xs text-orange-300 bg-orange-500/10 p-2.5 rounded-lg border border-orange-500/20">
                        ⚡ {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-orange-400" />
                    Policy Decisions & Automated Countermeasures
                  </h3>
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Decision: <span className="text-white">{selectedResult.risk_assessment?.recommended_decision}</span>
                    </div>
                    {selectedResult.explanation?.policy_decisions?.map((item, idx) => (
                      <div key={idx} className="text-xs text-gray-300 bg-gray-800/30 p-2.5 rounded-lg border border-gray-800">
                        🛡️ {item}
                      </div>
                    ))}
                    {selectedResult.alerts?.length > 0 && (
                      <div className="text-xs text-red-300 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                        🚨 Automated Alert Generated: {selectedResult.alerts[0].title}
                      </div>
                    )}
                    {selectedResult.prevention_actions?.length > 0 && (
                      <div className="text-xs text-orange-300 bg-orange-500/10 p-2.5 rounded-lg border border-orange-500/20">
                        🔒 Prevention Proposed: {selectedResult.prevention_actions[0].action_type}
                      </div>
                    )}
                    {selectedResult.incidents?.length > 0 && (
                      <div className="text-xs text-purple-300 bg-purple-500/10 p-2.5 rounded-lg border border-purple-500/20">
                        📂 Incident Created: {selectedResult.incidents[0].incident_number}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Module Latency Breakdown Table */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-orange-400" />
                  Concurrent Module Execution Telemetry
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400">
                        <th className="py-2.5 px-3">Module Identifier</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Processing Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 text-gray-300">
                      {selectedResult.processing_metadata?.module_latencies &&
                        Object.entries(selectedResult.processing_metadata.module_latencies).map(([mod, lat]) => (
                          <tr key={mod} className="hover:bg-gray-800/20">
                            <td className="py-2.5 px-3 font-mono text-gray-200">{mod}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                COMPLETED
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono">{lat.toFixed(1)} ms</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-12 text-center">
              <Workflow className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-gray-300">No Analysis Session Selected</h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                Click "Run Analysis" above to trigger a test scenario through the centralized orchestrator, or select a session from the Sessions tab.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Recent Analysis Sessions</h3>
            <span className="text-xs text-gray-400">{sessions.length} total sessions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="py-3 px-4">Analysis ID</th>
                  <th className="py-3 px-4">Correlation ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-gray-300">
                {sessions.map((sess) => (
                  <tr key={sess.analysis_id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-200">{sess.analysis_id}</td>
                    <td className="py-3 px-4 font-mono text-gray-400">{sess.correlation_id}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sess.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        sess.status === 'PARTIALLY_COMPLETED' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {sess.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {sess.overall_risk_score !== undefined && sess.overall_risk_score !== null ? sess.overall_risk_score.toFixed(1) : 'N/A'}
                    </td>
                    <td className="py-3 px-4 uppercase text-[10px] font-bold text-gray-400">{sess.risk_level || 'N/A'}</td>
                    <td className="py-3 px-4 text-gray-500">{sess.created_at ? new Date(sess.created_at).toLocaleTimeString() : 'N/A'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleInspectSession(sess.analysis_id)}
                        className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white">Integration Domain Events</h3>
              <p className="text-xs text-gray-400">Asynchronous domain event stream across integrated modules</p>
            </div>
            <button
              onClick={fetchEvents}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs"
            >
              Refresh Events
            </button>
          </div>

          <div className="space-y-3">
            {events.map((evt) => (
              <div key={evt.event_id} className="bg-gray-800/40 border border-gray-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-orange-400" />
                    <span className="font-semibold text-white">{evt.event_type}</span>
                    <span className="text-gray-500">v{evt.event_version}</span>
                  </div>
                  <span className="text-gray-500 font-mono text-[11px]">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-gray-400 font-mono">
                  <span>ID: {evt.event_id}</span>
                  <span>Corr: {evt.correlation_id}</span>
                  <span>Source: {evt.source_module}</span>
                </div>
                {evt.payload && (
                  <pre className="text-[11px] bg-black/40 p-2.5 rounded-lg text-gray-300 overflow-x-auto font-mono">
                    {JSON.stringify(evt.payload, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
