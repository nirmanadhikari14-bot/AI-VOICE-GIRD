/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VoiceGuard dark theme palette
        'bg-primary': '#0a0b0f',
        'bg-secondary': '#0f1117',
        'bg-card': '#13151c',
        'bg-elevated': '#1a1d27',
        'border-subtle': '#1e2130',
        'border-default': '#252836',
        'border-strong': '#2e3347',
        // Accent colors
        'accent-blue': '#3b82f6',
        'accent-blue-glow': 'rgba(59,130,246,0.3)',
        'accent-cyan': '#06b6d4',
        'accent-purple': '#8b5cf6',
        'accent-green': '#10b981',
        'accent-yellow': '#f59e0b',
        'accent-orange': '#f97316',
        // Threat severity
        'threat-critical': '#ef4444',
        'threat-high': '#f97316',
        'threat-medium': '#f59e0b',
        'threat-low': '#10b981',
        'threat-none': '#6b7280',
        // Text
        'text-primary': '#e2e8f0',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
        'text-disabled': '#374151',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'waveform': 'waveform 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        waveform: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      backgroundImage: {
        'grid-pattern': `url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h1v32H0V0zm32 0h-1v32h1V0zM0 0v1h32V0H0zm0 32v-1h32v1H0z' fill='%23ffffff' fill-opacity='0.02'/%3E%3C/svg%3E")`,
        'radial-glow': 'radial-gradient(ellipse at top, rgba(59,130,246,0.08) 0%, transparent 60%)',
      },
    },
  },
  plugins: [],
}
