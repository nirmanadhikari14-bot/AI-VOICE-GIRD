import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, PhoneCall, Search, Shield, Mic,
  Users, Database, Settings, Activity, ShieldCheck
} from 'lucide-react'
import clsx from 'clsx'

const NAV_ITEMS = [
  { path: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/live',         icon: PhoneCall,        label: 'Live Calls' },
  { path: '/investigation',icon: Search,           label: 'Investigation' },
  { path: '/prevention',   icon: Shield,           label: 'Attack Prevention' },
  { path: '/speakers',     icon: Users,            label: 'Speaker Profiles' },
  { path: '/audio',        icon: Mic,              label: 'Audio Engine' },
]

const BOTTOM_ITEMS = [
  { path: '/admin',     icon: ShieldCheck, label: 'Admin Portal' },
  { path: '/database',  icon: Database,    label: 'Database' },
  { path: '/settings',  icon: Settings,    label: 'Settings' },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="flex flex-col w-56 shrink-0 bg-bg-secondary border-r border-border-subtle h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border-subtle">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-accent-blue/20 border border-accent-blue/40">
          <Activity className="h-4 w-4 text-accent-blue" />
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary leading-none">VoiceGuard</p>
          <p className="text-xs text-text-muted mt-0.5">AI Platform</p>
        </div>
      </div>

      {/* Section label */}
      <div className="px-4 pt-4 pb-1">
        <p className="text-xs font-medium text-text-disabled uppercase tracking-widest">Operations</p>
      </div>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 px-2">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
          const isActive = path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(path)
          return (
            <NavLink key={path} to={path}
              className={clsx(
                'nav-item',
                isActive && 'nav-item-active'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          )
        })}
      </nav>

      <div className="flex-1" />

      {/* Bottom nav */}
      <div className="px-4 pb-1 pt-2 border-t border-border-subtle">
        <p className="text-xs font-medium text-text-disabled uppercase tracking-widest mb-1">System</p>
      </div>
      <nav className="flex flex-col gap-0.5 px-2 pb-3">
        {BOTTOM_ITEMS.map(({ path, icon: Icon, label }) => (
          <NavLink key={path} to={path}
            className={clsx('nav-item', location.pathname.startsWith(path) && 'nav-item-active')}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
