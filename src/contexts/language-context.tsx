'use client'

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from 'react'
import { type Lang, translate } from '@/lib/i18n'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const STORAGE_KEY = 'kres_lang'
const listeners = new Set<() => void>()

function readStoredLang(): Lang {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'ru') return stored
  const nav = window.navigator.language?.toLowerCase() ?? ''
  return nav.startsWith('ru') ? 'ru' : 'en'
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', cb)
  }
  return () => {
    listeners.delete(cb)
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', cb)
    }
  }
}

function notify() {
  listeners.forEach((l) => l())
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // 'en' on the server and during the first client render (avoids hydration
  // mismatch); after hydration useSyncExternalStore switches to the stored /
  // browser-detected language automatically.
  const lang = useSyncExternalStore(subscribe, readStoredLang, (): Lang => 'en')

  const setLang = useCallback((next: Lang) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next)
      document.documentElement.lang = next
    }
    notify()
  }, [])

  const t = useCallback((key: string) => translate(lang, key), [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return ctx
}
