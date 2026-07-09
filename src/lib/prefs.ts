import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'auto' | 'light' | 'dark'
export type FontSize = 'small' | 'medium' | 'large'

interface PrefsState {
  theme: ThemeMode
  fontSize: FontSize
  accent: string
  setTheme: (t: ThemeMode) => void
  setFontSize: (s: FontSize) => void
  setAccent: (a: string) => void
}

/** User-side preferences (stored in localStorage, per-browser). */
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      theme: 'auto',
      fontSize: 'medium',
      accent: '#000000',
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setAccent: (accent) => set({ accent }),
    }),
    { name: 'kres_prefs' },
  ),
)

const FONT_SIZE_PX: Record<FontSize, number> = {
  small: 13,
  medium: 15,
  large: 17,
}

/**
 * Apply user prefs to the document root. Call once on mount from a top-level
 * client component. Theme toggles the `dark` class; fontSize sets the root
 * font-size; accent sets a CSS variable.
 */
export function applyPrefs(theme: ThemeMode, fontSize: FontSize, accent: string) {
  if (typeof window === 'undefined') return
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = theme === 'dark' || (theme === 'auto' && prefersDark)
  root.classList.toggle('dark', isDark)
  root.style.fontSize = `${FONT_SIZE_PX[fontSize]}px`
  root.style.setProperty('--accent', accent)
}
