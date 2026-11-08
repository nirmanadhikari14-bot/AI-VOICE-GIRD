import { Bell, Search, Wifi, WifiOff } from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'

interface TopbarProps {
  title: string
  subtitle?: string
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const [backendOnline, setBackendOnline] = useState(false)
  const [alertCount] = useState(3)

  useEffect(() => {
    const check = () => {
      fetch('http://localhost:8000/api/v1/health')
        .then(r => { if (r.ok) setBackendOnline(true) })
        .catch(() => setBackendOnline(false))
    }
    check()
    const id = setInterval(check, 15000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="flex items-center justify-between h-14 px-5 bg-bg-secondary border-b border-border-subtle shrink-0">
      {/* Page title */}
      <div>
        <h1 className="text-sm font-semibold text-text-primary leading-none">{title}</h1>
        {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search calls, threats..."
            className="pl-8 pr-3 py-1.5 text-xs bg-bg-primary border border-border-default rounded-md
                       text-text-secondary placeholder-text-muted focus:outline-none focus:border-accent-blue
                       transition-colors w-52"
          />
        </div>

        {/* Backend status */}
        <div className={clsx(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono',
          backendOnline
            ? 'text-accent-green bg-emerald-900/20 border border-emerald-800/40'
            : 'text-threat-high bg-orange-900/20 border border-orange-800/40'
        )}>
          {backendOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {backendOnline ? 'API Online' : 'API Offline'}
        </div>

        {/* Alert bell */}
        <button className="relative p-1.5 rounded-md hover:bg-bg-elevated transition-colors">
          <Bell className="h-4 w-4 text-text-secondary" />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center
                             rounded-full bg-threat-critical text-white text-[9px] font-bold">
              {alertCount}
            </span>
          )}
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-border-default">
          <div className="h-7 w-7 rounded-full bg-accent-blue/20 border border-accent-blue/40
                          flex items-center justify-center text-xs font-semibold text-accent-blue">
            SO
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-medium text-text-primary leading-none">SOC Analyst</p>
            <p className="text-xs text-text-muted">Level 3</p>
          </div>
        </div>
      </div>
    </header>
  )
}
