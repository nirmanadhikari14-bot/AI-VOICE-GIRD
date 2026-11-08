import type { Severity } from '../types'

/**
 * Returns tailwind classes for a severity badge
 */
export function severityClass(sev: Severity): string {
  switch (sev) {
    case 'critical': return 'severity-critical'
    case 'high':     return 'severity-high'
    case 'medium':   return 'severity-medium'
    case 'low':      return 'severity-low'
    default:         return 'severity-none'
  }
}

export function severityLabel(sev: Severity): string {
  return sev.charAt(0).toUpperCase() + sev.slice(1)
}

export function riskColor(score: number): string {
  if (score >= 80) return 'text-threat-critical'
  if (score >= 60) return 'text-threat-high'
  if (score >= 40) return 'text-threat-medium'
  if (score >= 20) return 'text-threat-low'
  return 'text-threat-none'
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
