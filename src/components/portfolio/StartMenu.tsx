'use client'

import { useEffect, useRef } from 'react'
import { Power } from 'lucide-react'
import { WINDOWS, type WindowId, BEVEL_OUT_THIN, FACE } from './types'

interface StartMenuProps {
  t: (k: string) => string
  onClose: () => void
  onOpen: (id: WindowId) => void
  onLogout: () => void
  isAdmin?: boolean
}

export function StartMenu({ t, onClose, onOpen, onLogout, isAdmin }: StartMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on outside click / Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      ref={rootRef}
      role="menu"
      aria-label={t('desk.start')}
      className="absolute left-0 bottom-0 z-40 flex"
      style={{ background: FACE, ...BEVEL_OUT_THIN, minWidth: '14rem' }}
    >
      {/* Vertical banner strip (Win98-style, monochrome) */}
      <div
        className="flex items-center justify-center w-6 md:w-7 bg-black"
        aria-hidden
      >
        <span
          className="text-white font-bold text-[13px] tracking-[0.2em] uppercase whitespace-nowrap"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {t('desk.menuBrand')}
        </span>
      </div>

      {/* Menu items */}
      <div className="flex-1 py-1">
        {WINDOWS.filter((meta) => !meta.adminOnly || isAdmin).map((meta) => (
          <button
            key={meta.id}
            role="menuitem"
            type="button"
            onClick={() => {
              onOpen(meta.id)
              onClose()
            }}
            className="flex w-full items-center gap-3 px-3 py-1.5 text-[13px] text-black text-left hover:bg-black hover:text-white"
          >
            <meta.Icon className="w-4 h-4 shrink-0" aria-hidden />
            <span className="truncate">{t(meta.labelKey)}</span>
          </button>
        ))}

        <div className="my-1 mx-2 h-px" style={{ background: '#808080', boxShadow: '0 1px 0 0 #fff' }} />

        <button
          role="menuitem"
          type="button"
          onClick={() => {
            onLogout()
            onClose()
          }}
          className="flex w-full items-center gap-3 px-3 py-1.5 text-[13px] text-black text-left hover:bg-black hover:text-white"
        >
          <Power className="w-4 h-4 shrink-0" aria-hidden />
          <span className="truncate">{t('desk.shutdown')}</span>
        </button>
      </div>
    </div>
  )
}
