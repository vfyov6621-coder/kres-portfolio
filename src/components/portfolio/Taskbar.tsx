'use client'

import { useState } from 'react'
import { formatTrayClock, useClock } from './useClock'
import { WINDOWS, type WindowId, type WindowState, BEVEL_IN_THIN, BEVEL_OUT_THIN, FACE } from './types'

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
      className="relative z-30 flex h-11 md:h-10 items-stretch gap-1 px-1 select-none"
      style={{
        background: FACE,
        boxShadow: 'inset 0 1px 0 0 #fff, inset 0 -1px 0 0 #808080',
      }}
    >
      {/* Start button */}
      <button
        type="button"
        onClick={onStart}
        onMouseEnter={() => setStartHover(true)}
        onMouseLeave={() => setStartHover(false)}
        aria-pressed={startOpen}
        className="flex items-center gap-1 px-2 min-w-[64px] text-[13px] font-bold text-black"
        style={startOpen || startHover ? BEVEL_IN_THIN : BEVEL_OUT_THIN}
      >
        <span
          aria-hidden
          className="inline-block w-3.5 h-3.5 relative"
          style={{
            background: '#000',
            boxShadow: 'inset 0 0 0 1px #fff, inset 0 0 0 2px #000',
          }}
        >
          <span
            className="absolute inset-[3px] block"
            style={{ background: '#fff' }}
          />
        </span>
        <span className="uppercase tracking-tight">{t('desk.start')}</span>
      </button>

      {/* Divider */}
      <div className="my-0 md:my-1 w-px" style={{ background: '#808080', boxShadow: '1px 0 0 0 #fff' }} />

      {/* Window buttons (truncated) */}
      <div className="flex-1 flex items-stretch gap-0.5 overflow-x-auto py-0 md:py-0.5 min-w-0 no-scrollbar">
        {windows.length === 0 && (
          <div className="flex items-center px-2 text-[12px] text-black/50 italic">
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
              className={
                'flex items-center gap-1.5 px-2 text-[12px] text-black shrink-0 max-w-[180px] ' +
                (isActive ? 'font-bold' : 'font-normal')
              }
              style={isActive ? BEVEL_IN_THIN : BEVEL_OUT_THIN}
              title={t(meta.labelKey)}
            >
              <meta.Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
              <span className="truncate">{t(meta.labelKey)}</span>
            </button>
          )
        })}
      </div>

      {/* System tray + clock */}
      <div
        className="flex items-center gap-1 px-2 text-[12px] text-black shrink-0"
        style={BEVEL_IN_THIN}
      >
        <span className="tabular-nums hidden sm:inline">{formatTrayClock(now)}</span>
        <span className="tabular-nums sm:hidden">{formatTrayClock(now)}</span>
      </div>
    </footer>
  )
}
