'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { LANG_LABELS, type Lang } from '@/lib/i18n'
import './terminal.css'

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type Phase = 'boot' | 'language' | 'menu' | 'login' | 'register'
type LoginField = 'username' | 'password' | 'submitting' | 'done'
type RegisterField = 'username' | 'password' | 'confirm' | 'submitting' | 'done'

type BootStep =
  | { kind: 'text'; line: (t: (k: string) => string) => string }
  | { kind: 'progress'; labelKey: string }

/* -------------------------------------------------------------------------- */
/*  Formatting helpers                                                        */
/* -------------------------------------------------------------------------- */

const OS_VERSION = 'v2.1.905'
const LABEL_WIDTH = 36
const BAR_WIDTH = 8

/** Pads a label with leading dots so the suffix column aligns. */
function dots(label: string, width = LABEL_WIDTH): string {
  const pad = Math.max(2, width - label.length)
  return `${label} ${'.'.repeat(pad)}`
}

/** Renders a textual progress bar like `████░░░░`. */
function bar(pct: number, width = BAR_WIDTH): string {
  const filled = Math.round((pct / 100) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

/** Right-pads the percentage to 3 chars for column alignment. */
function pctString(pct: number): string {
  return String(pct).padStart(3, ' ')
}

/** Masks a stored value as bullets for re-rendering past password fields. */
function mask(value: string): string {
  return '•'.repeat(value.length)
}

/* -------------------------------------------------------------------------- */
/*  Boot sequence definition                                                  */
/* -------------------------------------------------------------------------- */

const BOOT_STEPS: BootStep[] = [
  { kind: 'text', line: (t) => `${t('term.osName')} ${OS_VERSION}` },
  { kind: 'text', line: (t) => t('term.bootLine1') },
  { kind: 'progress', labelKey: 'term.boot.initKernel' },
  { kind: 'text', line: (t) => `> ${dots(t('term.boot.probeMemory'))} [${t('term.ok')}]` },
  { kind: 'text', line: (t) => `> ${dots(t('term.boot.detectCpu'))} [${t('term.ok')}]` },
  { kind: 'text', line: (t) => `> ${dots(t('term.boot.initInterrupts'))} [${t('term.ok')}]` },
  { kind: 'progress', labelKey: 'term.boot.loadDrivers' },
  { kind: 'text', line: (t) => `> ${dots(t('term.boot.registerDevices'))} [${t('term.ok')}]` },
  { kind: 'text', line: (t) => `> ${dots(t('term.boot.buildSysTree'))} [${t('term.ok')}]` },
  { kind: 'text', line: (t) => `> ${dots(t('term.boot.mountFs'))} [${t('term.ok')}]` },
  { kind: 'text', line: (t) => `> ${dots(t('term.boot.syncRtc'))} [${t('term.ok')}]` },
  { kind: 'text', line: (t) => `> ${dots(t('term.boot.loadFontCache'))} [${t('term.ok')}]` },
  { kind: 'text', line: (t) => `> ${dots(t('term.boot.netStack'))} [${t('term.ok')}]` },
  { kind: 'text', line: (t) => `> ${dots(t('term.boot.identityVault'))} [${t('term.ok')}]` },
  { kind: 'progress', labelKey: 'term.boot.validateSignatures' },
  { kind: 'progress', labelKey: 'term.boot.modules' },
  { kind: 'text', line: (t) => `> ${dots(t('term.boot.spawnShell'))} [${t('term.ok')}]` },
  { kind: 'text', line: (t) => `> ${dots(t('term.boot.loadTheme'))} [${t('term.ok')}]` },
  { kind: 'text', line: (t) => `> ${dots(t('term.boot.calibrateInput'))} [${t('term.ok')}]` },
  { kind: 'text', line: (t) => `> ${dots(t('term.boot.encrypt'))} [${t('term.ok')}]` },
  { kind: 'text', line: (t) => `> ${dots(t('term.boot.armWatchdog'))} [${t('term.ok')}]` },
  { kind: 'progress', labelKey: 'term.boot.handshakeAuth' },
  { kind: 'text', line: () => '' },
  { kind: 'text', line: (t) => t('term.selectLanguage') },
  { kind: 'text', line: (t) => t('term.languageHint') },
]

const ERROR_KEY_MAP: Record<string, string> = {
  invalid_credentials: 'term.errInvalidCredentials',
  username_invalid: 'term.errUsernameInvalid',
  password_invalid: 'term.errPasswordInvalid',
  username_taken: 'term.errUsernameTaken',
  same_password: 'term.errSamePassword',
  missing_fields: 'term.errMissingFields',
  invalid_current: 'term.errInvalidCurrent',
  generic: 'term.errGeneric',
}

function errKey(code: string | undefined): string {
  return ERROR_KEY_MAP[code ?? 'generic'] ?? 'term.errGeneric'
}

/* -------------------------------------------------------------------------- */
/*  BootProgress — animates a single loading-bar line.                        */
/*  Extracted into its own component so the boot driver effect doesn't have   */
/*  to call setState synchronously (which trips react-hooks/set-state-in-effect). */
/* -------------------------------------------------------------------------- */

function BootProgress({
  label,
  okLabel,
  onComplete,
}: {
  label: string
  okLabel: string
  onComplete: (finalLine: string) => void
}) {
  const [pct, setPct] = useState(0)
  const doneRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const start = Date.now()
    const duration = 750
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const next = Math.min(100, Math.round((elapsed / duration) * 100))
      setPct(next)
      if (next >= 100 && !doneRef.current) {
        doneRef.current = true
        clearInterval(interval)
        const finalLine = `> ${dots(label)} [${bar(100)}] ${pctString(100)}% [${okLabel}]`
        timeoutRef.current = setTimeout(() => onComplete(finalLine), 180)
      }
    }, 40)
    return () => {
      clearInterval(interval)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [label, okLabel, onComplete])

  return (
    <div className="term-line">
      <span className="term-dim">{`> ${dots(label)}`}</span>{' '}
      <span>{`[${bar(pct)}] ${pctString(pct)}%`}</span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  TerminalAuth                                                              */
/* -------------------------------------------------------------------------- */

export default function TerminalAuth() {
  const { login, register } = useAuth()
  const { setLang, t } = useLanguage()

  const [phase, setPhase] = useState<Phase>('boot')
  const [bootLines, setBootLines] = useState<string[]>([])
  const [bootStep, setBootStep] = useState(0)
  const [bootStarted, setBootStarted] = useState(false)

  const [langHover, setLangHover] = useState<Lang | null>(null)
  const [menuChoice, setMenuChoice] = useState<'1' | '2' | null>(null)

  const [loginField, setLoginField] = useState<LoginField>('username')
  const [registerField, setRegisterField] = useState<RegisterField>('username')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const tRef = useRef(t)

  /* Keep tRef in sync with the latest translate function without reading
     the ref during render. */
  useEffect(() => {
    tRef.current = t
  }, [t])

  /* Wait a tick so the LanguageProvider can detect the browser language
     before we start "typing" the boot lines. */
  useEffect(() => {
    const id = setTimeout(() => setBootStarted(true), 120)
    return () => clearTimeout(id)
  }, [])

  /* Auto-scroll to the bottom whenever the visible content changes. */
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [bootLines, phase, loginField, registerField, error, success, menuChoice, langHover, bootStep])

  /* Centralised phase transition that resets the relevant form state. */
  const transitionTo = useCallback((next: Phase) => {
    if (next === 'login') {
      setUsername('')
      setPassword('')
      setError(null)
      setSuccess(null)
      setLoginField('username')
    } else if (next === 'register') {
      setUsername('')
      setPassword('')
      setConfirm('')
      setError(null)
      setSuccess(null)
      setRegisterField('username')
    } else if (next === 'menu') {
      setMenuChoice(null)
      setError(null)
      setSuccess(null)
    }
    setPhase(next)
  }, [])

  const handleProgressComplete = useCallback((finalLine: string) => {
    setBootLines((prev) => [...prev, finalLine])
    setBootStep((s) => s + 1)
  }, [])

  /* Boot driver — only schedules text steps. Progress steps are rendered via
     <BootProgress /> which calls back into handleProgressComplete. */
  useEffect(() => {
    if (!bootStarted || phase !== 'boot') return
    if (bootStep >= BOOT_STEPS.length) {
      const id = setTimeout(() => transitionTo('language'), 400)
      return () => clearTimeout(id)
    }
    const step = BOOT_STEPS[bootStep]
    if (step.kind === 'progress') {
      // handled by <BootProgress />
      return
    }
    const delay = 90 + Math.random() * 90
    const id = setTimeout(() => {
      setBootLines((prev) => [...prev, step.line(tRef.current)])
      setBootStep((s) => s + 1)
    }, delay)
    return () => clearTimeout(id)
  }, [bootStarted, phase, bootStep, transitionTo])

  /* Focus the active input whenever it changes. */
  useEffect(() => {
    if (phase !== 'login' && phase !== 'register') return
    if (loginField === 'submitting' || loginField === 'done') return
    if (registerField === 'submitting' || registerField === 'done') return
    const id = setTimeout(() => inputRef.current?.focus(), 30)
    return () => clearTimeout(id)
  }, [phase, loginField, registerField])

  const chooseLang = useCallback(
    (next: Lang) => {
      setLang(next)
      transitionTo('menu')
    },
    [setLang, transitionTo],
  )

  const submitLogin = useCallback(async () => {
    setError(null)
    if (!username || !password) {
      setError(tRef.current('term.errMissingFields'))
      return
    }
    setLoginField('submitting')
    const res = await login(username, password)
    if (res.ok) {
      setSuccess(tRef.current('term.loginSuccess'))
      setLoginField('done')
      return
    }
    setError(tRef.current(errKey(res.error)))
    setPassword('')
    setLoginField('username')
  }, [username, password, login])

  const submitRegister = useCallback(async () => {
    setError(null)
    if (!username || !password || !confirm) {
      setError(tRef.current('term.errMissingFields'))
      return
    }
    if (password !== confirm) {
      setError(tRef.current('term.errPasswordMismatch'))
      return
    }
    setRegisterField('submitting')
    const res = await register(username, password)
    if (res.ok) {
      setSuccess(tRef.current('term.registerSuccess'))
      setRegisterField('done')
      return
    }
    setError(tRef.current(errKey(res.error)))
    setPassword('')
    setConfirm('')
    setRegisterField('username')
  }, [username, password, confirm, register])

  const onLoginKey = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      if (loginField === 'username') {
        if (!username) {
          setError(tRef.current('term.errMissingFields'))
          return
        }
        setError(null)
        setLoginField('password')
      } else if (loginField === 'password') {
        void submitLogin()
      }
    },
    [loginField, username, submitLogin],
  )

  const onRegisterKey = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      if (registerField === 'username') {
        if (!username) {
          setError(tRef.current('term.errMissingFields'))
          return
        }
        setError(null)
        setRegisterField('password')
      } else if (registerField === 'password') {
        if (!password) {
          setError(tRef.current('term.errMissingFields'))
          return
        }
        setError(null)
        setRegisterField('confirm')
      } else if (registerField === 'confirm') {
        void submitRegister()
      }
    },
    [registerField, username, password, submitRegister],
  )

  /* Global keyboard handler — language picks, menu nav, ESC for forms. */
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (phase === 'language') {
        if (e.key === '1') {
          e.preventDefault()
          chooseLang('en')
        } else if (e.key === '2') {
          e.preventDefault()
          chooseLang('ru')
        }
      } else if (phase === 'menu') {
        if (e.key === '1') {
          e.preventDefault()
          setMenuChoice('1')
        } else if (e.key === '2') {
          e.preventDefault()
          setMenuChoice('2')
        } else if (e.key === 'Enter') {
          e.preventDefault()
          if (menuChoice === '1') transitionTo('login')
          else if (menuChoice === '2') transitionTo('register')
        }
      } else if (phase === 'login' || phase === 'register') {
        if (e.key === 'Escape') {
          e.preventDefault()
          transitionTo('menu')
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, menuChoice, chooseLang, transitionTo])

  const currentBootStep =
    bootStarted && phase === 'boot' && bootStep < BOOT_STEPS.length
      ? BOOT_STEPS[bootStep]
      : null

  return (
    <div className="term-root fixed inset-0 z-50 bg-black font-mono">
      <div className="crt-scanlines pointer-events-none fixed inset-0 z-10" aria-hidden="true" />

      <div
        ref={scrollRef}
        className="term-body relative h-full overflow-y-auto px-4 py-4 sm:px-6 sm:py-6"
        onClick={(e) => {
          if (
            e.target === e.currentTarget &&
            (phase === 'login' || phase === 'register')
          ) {
            inputRef.current?.focus()
          }
        }}
      >
        {/* Boot lines (already completed) */}
        {bootLines.map((line, i) => (
          <div key={i} className="term-line">
            {line === '' ? '\u00A0' : line}
          </div>
        ))}

        {/* In-progress boot progress bar */}
        {currentBootStep?.kind === 'progress' && (
          <BootProgress
            key={bootStep}
            label={t(currentBootStep.labelKey)}
            okLabel={t('term.ok')}
            onComplete={handleProgressComplete}
          />
        )}

        {/* ---------------------------- LANGUAGE ---------------------------- */}
        {phase === 'language' && (
          <section className="term-section">
            <div className="term-line">
              <span className="term-prompt">{t('term.selectLanguage')}</span>
            </div>
            <div className="term-line term-dim">{t('term.languageHint')}</div>
            <div className="term-line mt-2 flex flex-wrap gap-3">
              {(['en', 'ru'] as Lang[]).map((l, idx) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => chooseLang(l)}
                  onMouseEnter={() => setLangHover(l)}
                  onMouseLeave={() => setLangHover(null)}
                  onFocus={() => setLangHover(l)}
                  onBlur={() => setLangHover(null)}
                  className={`term-btn min-h-[44px] ${
                    langHover === l ? 'term-btn-active' : ''
                  }`}
                  aria-label={`${LANG_LABELS[l]} (${idx + 1})`}
                >
                  <span className="term-dim mr-2">{`[${idx + 1}]`}</span>
                  <span>{LANG_LABELS[l]}</span>
                </button>
              ))}
            </div>
            <div className="term-line mt-1">
              <span className="term-prompt">{'> '}</span>
              <span className="term-cursor" aria-hidden="true" />
            </div>
          </section>
        )}

        {/* ------------------------------ MENU ------------------------------ */}
        {phase === 'menu' && (
          <section className="term-section">
            <div className="term-line">{t('term.welcome')}</div>
            <button
              type="button"
              onClick={() => transitionTo('login')}
              onMouseEnter={() => setMenuChoice('1')}
              className={`term-link block w-full text-left min-h-[40px] ${
                menuChoice === '1' ? 'term-link-active' : ''
              }`}
            >
              <span className="term-dim">[1]</span> {t('term.optionLogin')}
            </button>
            <button
              type="button"
              onClick={() => transitionTo('register')}
              onMouseEnter={() => setMenuChoice('2')}
              className={`term-link block w-full text-left min-h-[40px] ${
                menuChoice === '2' ? 'term-link-active' : ''
              }`}
            >
              <span className="term-dim">[2]</span> {t('term.optionRegister')}
            </button>
            <div className="term-line term-dim mt-1">{t('term.orType')}</div>
            <div className="term-line mt-1">
              <span className="term-prompt">{'> '}</span>
              <span className="term-cursor" aria-hidden="true" />
            </div>
          </section>
        )}

        {/* ------------------------------ LOGIN ----------------------------- */}
        {phase === 'login' && (
          <section className="term-section">
            <div className="term-line term-prompt">{t('term.loginPrompt')}</div>

            <div className="term-line flex items-baseline">
              <span className="term-prompt shrink-0">username&gt; </span>
              {loginField === 'username' ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={onLoginKey}
                  className="term-input"
                  autoComplete="username"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label={t('term.username')}
                />
              ) : (
                <span className="term-value">{username || '\u00A0'}</span>
              )}
            </div>

            {(loginField === 'password' ||
              loginField === 'submitting' ||
              loginField === 'done') && (
              <div className="term-line flex items-baseline">
                <span className="term-prompt shrink-0">password&gt; </span>
                {loginField === 'password' ? (
                  <input
                    ref={inputRef}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={onLoginKey}
                    className="term-input"
                    autoComplete="current-password"
                    aria-label={t('term.password')}
                  />
                ) : (
                  <span className="term-value">
                    {password ? mask(password) : '\u00A0'}
                  </span>
                )}
              </div>
            )}

            {loginField === 'submitting' && (
              <div className="term-line term-dim mt-1">{t('term.processing')}</div>
            )}
            {loginField === 'done' && success && (
              <div className="term-line term-success mt-1">{success}</div>
            )}
            {error && (
              <div className="term-line term-error mt-1">{`! ${error}`}</div>
            )}

            {loginField === 'password' && (
              <div className="term-line mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void submitLogin()}
                  className="term-btn min-h-[44px]"
                >
                  {t('term.submit')}
                </button>
                <span className="term-dim">{t('term.exitHint')}</span>
              </div>
            )}
            {loginField === 'username' && (
              <div className="term-line term-dim mt-1">{t('term.exitHint')}</div>
            )}
          </section>
        )}

        {/* ---------------------------- REGISTER ---------------------------- */}
        {phase === 'register' && (
          <section className="term-section">
            <div className="term-line term-prompt">{t('term.registerPrompt')}</div>

            <div className="term-line flex items-baseline">
              <span className="term-prompt shrink-0">username&gt; </span>
              {registerField === 'username' ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={onRegisterKey}
                  className="term-input"
                  autoComplete="username"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label={t('term.username')}
                />
              ) : (
                <span className="term-value">{username || '\u00A0'}</span>
              )}
            </div>

            {(registerField === 'password' ||
              registerField === 'confirm' ||
              registerField === 'submitting' ||
              registerField === 'done') && (
              <div className="term-line flex items-baseline">
                <span className="term-prompt shrink-0">password&gt; </span>
                {registerField === 'password' ? (
                  <input
                    ref={inputRef}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={onRegisterKey}
                    className="term-input"
                    autoComplete="new-password"
                    aria-label={t('term.password')}
                  />
                ) : (
                  <span className="term-value">
                    {password ? mask(password) : '\u00A0'}
                  </span>
                )}
              </div>
            )}

            {(registerField === 'confirm' ||
              registerField === 'submitting' ||
              registerField === 'done') && (
              <div className="term-line flex items-baseline">
                <span className="term-prompt shrink-0">confirm&gt; </span>
                {registerField === 'confirm' ? (
                  <input
                    ref={inputRef}
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onKeyDown={onRegisterKey}
                    className="term-input"
                    autoComplete="new-password"
                    aria-label={t('term.confirmPassword')}
                  />
                ) : (
                  <span className="term-value">
                    {confirm ? mask(confirm) : '\u00A0'}
                  </span>
                )}
              </div>
            )}

            {registerField === 'submitting' && (
              <div className="term-line term-dim mt-1">{t('term.processing')}</div>
            )}
            {registerField === 'done' && success && (
              <div className="term-line term-success mt-1">{success}</div>
            )}
            {error && (
              <div className="term-line term-error mt-1">{`! ${error}`}</div>
            )}

            {registerField === 'confirm' && (
              <div className="term-line mt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void submitRegister()}
                  className="term-btn min-h-[44px]"
                >
                  {t('term.submit')}
                </button>
                <span className="term-dim">{t('term.exitHint')}</span>
              </div>
            )}
            {(registerField === 'username' || registerField === 'password') && (
              <div className="term-line term-dim mt-1">{t('term.exitHint')}</div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
