'use client'

import { useState } from 'react'
import { formatTrayClock, useClock } from './useClock'
import { WINDOWS, type WindowId, type WindowState, ACCENT } from './types'

interface TaskbarProps {
  t: (k: string) => string
  windows: WindowState[]
  startOpen: boolean
  onStart: () => void
  onTaskClick: (id: WindowId) => void
  activeId: WindowId | null
}

export function Taskbar({ t, windows, startOpen, onStart, onTaskClick, activeId }: TaskbarProps) {
  const now = useClock()
  const [startHover, setStartHover] = useState(false)

  return (
    <footer
      className="relative z-30 flex h-12 items-stretch gap-1 px-2 select-none"
      style={{
        background: 'rgba(20,20,20,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 -1px 0 rgba(255,255,255,0.08)',
      }}
    >
      {/* Start button — Win10 style */}
      <button
        type="button"
        onClick={onStart}
        onMouseEnter={() => setStartHover(true)}
        onMouseLeave={() => setStartHover(false)}
        aria-pressed={startOpen}
        className="flex items-center justify-center w-12 h-full transition-colors"
        style={{ background: startOpen || startHover ? 'rgba(255,255,255,0.1)' : 'transparent' }}
      >
        {/* Win10 logo — 4 squares */}
        <span className="grid grid-cols-2 gap-[2px]" aria-hidden>
          <span style={{ width: 6, height: 6, background: '#0078d4' }} />
          <span style={{ width: 6, height: 6, background: '#0078d4' }} />
          <span style={{ width: 6, height: 6, background: '#0078d4' }} />
          <span style={{ width: 6, height: 6, background: '#0078d4' }} />
        </span>
      </button>

      {/* Search bar — Win10 style */}
      <div className="hidden md:flex items-center gap-2 px-3 my-1.5 text-[12px] text-white/50 rounded-[4px]" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <span>🔍</span>
        <span>{t('desk.start')}</span>
      </div>

      {/* Window buttons */}
      <div className="flex-1 flex items-stretch gap-0.5 overflow-x-auto py-1 min-w-0 no-scrollbar">
        {windows.length === 0 && (
          <div className="flex items-center px-2 text-[12px] text-white/40 italic">
            {t('desk.noWindows')}
          </div>
        )}
        {windows.map((w) => {
          const meta = WINDOWS.find((m) => m.id === w.id)
          if (!meta) return null
          const isActive = activeId === w.id && !w.minimized
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => onTaskClick(w.id)}
              className="flex items-center gap-1.5 px-3 text-[12px] text-white shrink-0 max-w-[200px] rounded-[4px] transition-colors"
              style={{
                background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                borderBottom: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
              }}
              title={t(meta.labelKey)}
            >
              <meta.Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <span className="truncate">{t(meta.labelKey)}</span>
            </button>
          )
        })}
      </div>

      {/* System tray + clock */}
      <div className="flex items-center gap-2 px-3 text-[12px] text-white shrink-0">
        <span className="tabular-nums">{formatTrayClock(now)}</span>
      </div>
    </footer>
  )
}
