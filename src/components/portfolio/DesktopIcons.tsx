'use client'

import { WINDOWS, type WindowId } from './types'
import { cn } from '@/lib/utils'

interface DesktopIconsProps {
  t: (k: string) => string
  selected: WindowId | null
  onSelect: (id: WindowId | null) => void
  onOpen: (id: WindowId) => void
  isAdmin?: boolean
}

export function DesktopIcons({ t, selected, onSelect, onOpen, isAdmin }: DesktopIconsProps) {
  const visibleWindows = WINDOWS.filter((meta) => !meta.adminOnly || isAdmin)
  return (
    <div
      // Mobile: horizontal scrollable strip at top. Desktop: vertical column on left.
      className="absolute z-10 top-2 left-1 right-1 flex md:flex-col md:right-auto gap-1 overflow-x-auto md:overflow-y-auto md:max-h-full no-scrollbar pb-1 md:pb-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect(null)
      }}
    >
      {visibleWindows.map((meta) => {
        const isSelected = selected === meta.id
        return (
          <button
            key={meta.id}
            type="button"
            onClick={() => onSelect(meta.id)}
            onDoubleClick={() => onOpen(meta.id)}
            // Mobile: single tap opens (better UX on touch). Desktop: double-click.
            onTouchEnd={(e) => {
              if (!isSelected) {
                e.preventDefault()
                onOpen(meta.id)
              }
            }}
            className={cn(
              'flex flex-col items-center gap-0.5 w-16 md:w-20 p-1 text-center shrink-0',
              'focus:outline-none',
            )}
            aria-pressed={isSelected}
          >
            <span
              className={cn(
                'w-9 h-9 md:w-10 md:h-10 flex items-center justify-center',
                isSelected ? 'bg-white' : 'bg-transparent',
              )}
              style={isSelected ? { boxShadow: '0 0 0 1px #fff' } : undefined}
            >
              <meta.Icon
                className="w-5 h-5 md:w-6 md:h-6"
                style={{ color: isSelected ? '#000' : '#fff' }}
                aria-hidden
              />
            </span>
            <span
              className={cn(
                'text-[10px] md:text-[11px] leading-tight px-0.5',
                isSelected ? 'text-black' : 'text-white',
              )}
              style={isSelected ? { background: '#fff' } : undefined}
            >
              {t(meta.labelKey)}
            </span>
          </button>
        )
      })}

      <p className="hidden md:block mt-2 px-1 text-[10px] text-white/40 leading-tight">{t('desk.doubleClick')}</p>
    </div>
  )
}
