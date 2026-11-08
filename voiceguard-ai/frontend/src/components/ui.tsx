import clsx from 'clsx'
import type { Severity } from '../types'
import { severityClass, severityLabel } from '../utils/ui'

interface SeverityBadgeProps {
  severity: Severity
  className?: string
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span className={clsx('stat-badge', severityClass(severity), className)}>
      {severityLabel(severity)}
    </span>
  )
}

interface RiskGaugeProps {
  score: number
  size?: 'sm' | 'md'
}

export function RiskGauge({ score, size = 'md' }: RiskGaugeProps) {
  const color = score >= 80 ? '#ef4444' : score >= 60 ? '#f97316' : score >= 40 ? '#f59e0b' : '#10b981'
  const dim = size === 'sm' ? 36 : 48
  const r = size === 'sm' ? 14 : 19
  const circumference = 2 * Math.PI * r
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="#1e2130" strokeWidth="3" />
        <circle
          cx={dim / 2} cy={dim / 2} r={r} fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className={clsx(
        'absolute font-mono font-semibold',
        size === 'sm' ? 'text-[10px]' : 'text-xs'
      )} style={{ color }}>
        {score}
      </span>
    </div>
  )
}

interface WaveformProps {
  bars?: number
  active?: boolean
}

export function Waveform({ bars = 16, active = true }: WaveformProps) {
  return (
    <div className="flex items-center gap-0.5 h-6">
      {Array.from({ length: bars }, (_, i) => (
        <div
          key={i}
          className="waveform-bar bg-accent-blue"
          style={{
            height: '100%',
            animationDelay: `${i * 0.08}s`,
            animationPlayState: active ? 'running' : 'paused',
            opacity: active ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  delta?: number
  trend?: 'up' | 'down' | 'stable'
  accent?: string
  icon?: React.ReactNode
}

export function StatCard({ label, value, unit, delta, trend, icon }: StatCardProps) {
  return (
    <div className="card p-4 flex flex-col gap-1 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{label}</span>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-2xl font-semibold font-mono text-text-primary">{value}</span>
        {unit && <span className="text-xs text-text-muted pb-0.5">{unit}</span>}
      </div>
      {delta !== undefined && trend !== 'stable' && (
        <span className={clsx('text-xs font-mono', trend === 'up' ? 'text-threat-high' : 'text-accent-green')}>
          {trend === 'up' ? '▲' : '▼'} {Math.abs(delta)} vs yesterday
        </span>
      )}
    </div>
  )
}
