'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Globe } from 'lucide-react'
import type { Lang } from '@/lib/i18n'
import type { AuthUser } from '@/contexts/auth-context'
import { useClock, formatMenuClock } from './useClock'
import { BEVEL_OUT_THIN, FACE } from './types'

interface MenuBarProps {
  user: AuthUser
  lang: Lang
  setLang: (l: Lang) => void
  t: (k: string) => string
  onChangePassword: () => void
  onLogout: () => void
}

const MENU_WORDS = ['desk.menuFile', 'desk.menuEdit', 'desk.menuView', 'desk.menuHelp'] as const

export function MenuBar({ user, lang, setLang, t, onChangePassword, onLogout }: MenuBarProps) {
  const now = useClock()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userMenuOpen) return
    const onDown = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [userMenuOpen])

  const badge = user.isAdmin ? t('desk.adminBadge') : t('desk.userBadge')

  return (
    <header
      className="relative z-30 flex h-6 md:h-7 items-center justify-between gap-2 bg-white px-2 text-black border-b border-black select-none"
      style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
    >
      {/* Left: brand + menu words */}
      <nav className="flex items-center gap-1 text-[13px] leading-none min-w-0">
        <span className="font-bold px-1 truncate">{t('desk.menuBrand')}</span>
        <span className="hidden md:flex items-center gap-1 ml-1">
          {MENU_WORDS.map((key) => (
            <button
              key={key}
              type="button"
              className="px-2 py-0.5 rounded-sm hover:bg-black hover:text-white transition-colors"
            >
              {t(key)}
            </button>
          ))}
        </span>
      </nav>

      {/* Right: language + clock + user */}
      <div className="flex items-center gap-2 md:gap-3 text-[12px] leading-none min-w-0">
        {/* Language toggle */}
        <div className="flex items-center gap-1 shrink-0" aria-label={t('desk.language')}>
          <Globe className="w-3.5 h-3.5 hidden sm:block" aria-hidden />
          {(['en', 'ru'] as const).map((l, i) => (
            <span key={l} className="flex items-center">
              {i > 0 && <span className="text-black/40 mx-0.5">|</span>}
              <button
                type="button"
                onClick={() => setLang(l)}
                className={
                  'px-0.5 hover:underline ' +
                  (lang === l ? 'font-bold underline' : 'text-black/60')
                }
              >
                {l.toUpperCase()}
              </button>
            </span>
          ))}
        </div>

        {/* Clock */}
        <span className="tabular-nums shrink-0" suppressHydrationWarning>
          {formatMenuClock(now, lang)}
        </span>

        {/* User indicator + dropdown */}
        <div ref={userMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex items-center gap-1 px-1 py-0.5 rounded-sm hover:bg-black hover:text-white transition-colors max-w-[40vw]"
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
          >
            <span className="truncate max-w-[20vw] md:max-w-[14ch]">{user.username}</span>
            <span
              className="px-1 py-0.5 text-[10px] uppercase tracking-wide border border-black/70"
              style={{ backgroundColor: user.isAdmin ? '#000' : '#fff', color: user.isAdmin ? '#fff' : '#000' }}
            >
              {badge}
            </span>
            <ChevronDown className="w-3 h-3" aria-hidden />
          </button>

          {userMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-px min-w-[10rem] z-50 p-0.5"
              style={{ background: FACE, ...BEVEL_OUT_THIN }}
            >
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setUserMenuOpen(false)
                  onChangePassword()
                }}
                className="block w-full text-left px-3 py-1.5 text-[13px] text-black hover:bg-black hover:text-white"
              >
                {t('desk.changePassword')}
              </button>
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setUserMenuOpen(false)
                  onLogout()
                }}
                className="block w-full text-left px-3 py-1.5 text-[13px] text-black hover:bg-black hover:text-white"
              >
                {t('desk.shutdown')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
