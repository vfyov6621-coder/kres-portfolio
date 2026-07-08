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
      className="absolute z-10 top-2 left-1 flex flex-col gap-1 max-h-full overflow-y-auto no-scrollbar"
      onClick={(e) => {
        // clicking empty area within the icon column deselects
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
            className={cn(
              'flex flex-col items-center gap-1 w-16 md:w-20 p-1 text-center',
              'focus:outline-none',
            )}
            aria-pressed={isSelected}
          >
            <span
              className={cn(
                'w-10 h-10 flex items-center justify-center',
                isSelected ? 'bg-white' : 'bg-transparent',
              )}
              style={isSelected ? { boxShadow: '0 0 0 1px #fff' } : undefined}
            >
              <meta.Icon
                className="w-6 h-6"
                style={{ color: isSelected ? '#000' : '#fff' }}
                aria-hidden
              />
            </span>
            <span
              className={cn(
                'text-[11px] leading-tight px-0.5',
                isSelected ? 'text-black' : 'text-white',
              )}
              style={isSelected ? { background: '#fff' } : undefined}
            >
              {t(meta.labelKey)}
            </span>
          </button>
        )
      })}

      <p className="mt-2 px-1 text-[10px] text-white/40 leading-tight">{t('desk.doubleClick')}</p>
    </div>
  )
}
