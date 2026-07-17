'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { useClock } from './portfolio/useClock'
import { formatTrayClock } from './portfolio/useClock'

const USERNAME_COOKIE = 'kres_remember_user'

function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

type Mode = 'login' | 'register'

/**
 * Win10-style lock screen with black background.
 * Remember username in cookie — only password needed on return.
 */
export default function Win10LockScreen() {
  const { login, register, loginAsGuest } = useAuth()
  const { lang, setLang, t } = useLanguage()
  const now = useClock()

  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [guestEnabled, setGuestEnabled] = useState(false)

  // Load remembered username from cookie on mount.
  useEffect(() => {
    const saved = getCookie(USERNAME_COOKIE)
    if (saved) {
      setUsername(saved)
      setRememberMe(true)
    }
  }, [])

  // Check if guest access is enabled.
  useEffect(() => {
    void (async () => {
      try {
        const { isGuestAccessEnabled } = await import('@/contexts/auth-context')
        setGuestEnabled(await isGuestAccessEnabled())
      } catch { setGuestEnabled(false) }
    })()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!username.trim() || !password) return
    setLoading(true)
    const res = await login(username, password)
    if (res.ok) {
      // Save or clear username in cookie based on rememberMe.
      if (rememberMe) setCookie(USERNAME_COOKIE, username.trim(), 30)
      else deleteCookie(USERNAME_COOKIE)
    } else {
      const code = res.error ?? 'generic'
      const key = code === 'invalid_credentials' ? 'term.errInvalidCredentials'
        : code === 'password_invalid' ? 'term.errPasswordInvalid'
        : code === 'username_invalid' ? 'term.errUsernameInvalid'
        : 'term.errGeneric'
      setError(t(key))
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!username.trim() || !password) return
    if (password !== confirm) { setError(t('term.errPasswordMismatch')); return }
    setLoading(true)
    const res = await register(username, password)
    if (res.ok) {
      if (rememberMe) setCookie(USERNAME_COOKIE, username.trim(), 30)
      else deleteCookie(USERNAME_COOKIE)
    } else {
      const code = res.error ?? 'generic'
      const key = code === 'username_taken' ? 'term.errUsernameTaken'
        : code === 'password_invalid' ? 'term.errPasswordInvalid'
        : code === 'username_invalid' ? 'term.errUsernameInvalid'
        : 'term.errGeneric'
      setError(t(key))
      setLoading(false)
    }
  }

  const handleGuest = async () => {
    setLoading(true)
    await loginAsGuest()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Top bar — clock + language */}
      <div className="absolute top-6 left-0 right-0 flex justify-between items-center px-8 z-10">
        <div className="text-white text-center">
          <div className="text-[48px] font-light leading-none">
            {now.toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-[14px] text-white/60 mt-1">
            {now.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div className="flex gap-2">
          {(['en', 'ru'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className="px-3 py-1.5 text-[12px] text-white rounded transition-colors"
              style={{ background: lang === l ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)' }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Centered login card */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-[400px]">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img
              src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo.png`}
              alt="Logo"
              className="w-20 h-20 object-contain mb-4 select-none"
              draggable={false}
            />
          </div>

          {/* Mode tabs */}
          <div className="flex mb-6 border-b border-white/10">
            <button
              onClick={() => { setMode('login'); setError(null) }}
              className="flex-1 pb-2 text-[14px] font-medium transition-colors"
              style={{
                color: mode === 'login' ? '#fff' : 'rgba(255,255,255,0.4)',
                borderBottom: mode === 'login' ? '2px solid #0078d4' : '2px solid transparent',
              }}
            >
              {t('term.optionLogin')}
            </button>
            <button
              onClick={() => { setMode('register'); setError(null) }}
              className="flex-1 pb-2 text-[14px] font-medium transition-colors"
              style={{
                color: mode === 'register' ? '#fff' : 'rgba(255,255,255,0.4)',
                borderBottom: mode === 'register' ? '2px solid #0078d4' : '2px solid transparent',
              }}
            >
              {t('term.optionRegister')}
            </button>
          </div>

          {/* Form */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('term.username')}
                autoComplete="username"
                className="w-full px-4 py-3 text-[14px] bg-white/5 border border-white/10 rounded text-white placeholder-white/30 outline-none focus:border-[#0078d4] transition-colors"
              />
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('term.password')}
                  autoComplete="current-password"
                  autoFocus={!!getCookie(USERNAME_COOKIE)}
                  className="w-full px-4 py-3 pr-12 text-[14px] bg-white/5 border border-white/10 rounded text-white placeholder-white/30 outline-none focus:border-[#0078d4] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-[18px]"
                  tabIndex={-1}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2 text-[12px] text-white/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-[#0078d4]"
                />
                {lang === 'ru' ? 'Запомнить логин' : 'Remember username'}
              </label>

              {error && <p className="text-[12px] text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading || !username.trim() || !password}
                className="w-full py-3 text-[14px] font-medium text-white rounded transition-colors disabled:opacity-40"
                style={{ background: '#0078d4' }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#1a86d9' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#0078d4' }}
              >
                {loading ? t('term.processing') : t('term.optionLogin')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="flex flex-col gap-3">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('term.username')}
                autoComplete="username"
                className="w-full px-4 py-3 text-[14px] bg-white/5 border border-white/10 rounded text-white placeholder-white/30 outline-none focus:border-[#0078d4] transition-colors"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('term.password')}
                autoComplete="new-password"
                className="w-full px-4 py-3 text-[14px] bg-white/5 border border-white/10 rounded text-white placeholder-white/30 outline-none focus:border-[#0078d4] transition-colors"
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t('term.confirmPassword')}
                autoComplete="new-password"
                className="w-full px-4 py-3 text-[14px] bg-white/5 border border-white/10 rounded text-white placeholder-white/30 outline-none focus:border-[#0078d4] transition-colors"
              />

              <label className="flex items-center gap-2 text-[12px] text-white/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-[#0078d4]"
                />
                {lang === 'ru' ? 'Запомнить логин' : 'Remember username'}
              </label>

              {error && <p className="text-[12px] text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading || !username.trim() || !password || !confirm}
                className="w-full py-3 text-[14px] font-medium text-white rounded transition-colors disabled:opacity-40"
                style={{ background: '#0078d4' }}
              >
                {loading ? t('term.processing') : t('term.optionRegister')}
              </button>
            </form>
          )}

          {/* Guest access */}
          {guestEnabled && (
            <button
              onClick={handleGuest}
              disabled={loading}
              className="w-full mt-4 py-2 text-[13px] text-white/60 hover:text-white transition-colors"
            >
              {t('desk.enterAsGuest')}
            </button>
          )}
        </div>
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-[11px] text-white/30">
        KRES-OS · Win10 Edition
      </div>
    </div>
  )
}
