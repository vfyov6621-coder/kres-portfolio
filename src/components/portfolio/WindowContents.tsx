'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { Lang } from '@/lib/i18n'
import type { AuthUser } from '@/contexts/auth-context'
import { usePortfolioStore } from '@/lib/portfolio-store'
import {
  subscribeToChat,
  sendChatMessage,
  cleanupExpiredMessages,
  cooldownRemaining,
  type ChatMessage,
} from '@/lib/chat'
import type { WindowId } from './types'
import { BEVEL_IN_THIN, BEVEL_OUT_THIN, FACE } from './types'
import { SnakeGame, Game2048 } from './Minigames'
import { usePrefs, applyPrefs } from '@/lib/prefs'

interface WindowContentsProps {
  id: WindowId
  user: AuthUser
  lang: Lang
  setLang: (l: Lang) => void
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ ok: boolean; error?: string }>
  t: (k: string) => string
}

export function WindowContents(props: WindowContentsProps) {
  switch (props.id) {
    case 'about':
      return <AboutContent t={props.t} />
    case 'projects':
      return <ProjectsContent t={props.t} />
    case 'skills':
      return <SkillsContent t={props.t} />
    case 'contact':
      return <ContactContent t={props.t} />
    case 'settings':
      return <SettingsContent {...props} />
    case 'chat':
      return <ChatContent t={props.t} user={props.user} />
    case 'minigames':
      return <MinigamesContent t={props.t} />
    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/* Shared layout primitives                                            */
/* ------------------------------------------------------------------ */

function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 text-[11px] italic text-black/40 border-t border-black/15 pt-2">
      {children}
    </p>
  )
}

function ContentShell({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="p-4 md:p-5 max-w-2xl mx-auto">
      <h2 className="text-[18px] font-bold tracking-tight mb-3">{title}</h2>
      {children}
      {hint ? <Hint>{hint}</Hint> : null}
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[12px] font-bold uppercase tracking-wide text-black/60 mb-2 mt-5 first:mt-0">
      {children}
    </h3>
  )
}

/* ------------------------------------------------------------------ */
/* About                                                               */
/* ------------------------------------------------------------------ */

function AboutContent({ t }: { t: (k: string) => string }) {
  const aboutBody = usePortfolioStore((s) => s.aboutBody)
  return (
    <ContentShell title={t('content.aboutTitle')} hint={t('content.aboutHint')}>
      <p className="text-[14px] leading-relaxed whitespace-pre-line">{aboutBody}</p>
    </ContentShell>
  )
}

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

function ProjectsContent({ t }: { t: (k: string) => string }) {
  const projects = usePortfolioStore((s) => s.projects)
  return (
    <ContentShell title={t('content.projectsTitle')} hint={t('content.projectsHint')}>
      <ul className="flex flex-col gap-3">
        {projects.map((p, i) => (
          <li key={p.id} className="p-3 bg-white" style={{ ...BEVEL_IN_THIN }}>
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] tabular-nums text-black/50">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="text-[14px] font-bold">{p.title || '\u00A0'}</h3>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-black/80">{p.description || '\u00A0'}</p>
            {p.link ? (
              <a
                href={p.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-[12px] underline text-black/70 break-all"
              >
                {p.link}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </ContentShell>
  )
}

/* ------------------------------------------------------------------ */
/* Skills                                                              */
/* ------------------------------------------------------------------ */

function SkillsContent({ t }: { t: (k: string) => string }) {
  const skills = usePortfolioStore((s) => s.skills)
  const visible = skills.filter((s) => s.trim().length > 0)
  return (
    <ContentShell title={t('content.skillsTitle')} hint={t('content.skillsHint')}>
      {visible.length === 0 ? (
        <p className="text-[13px] text-black/40">{t('desk.noProjects')}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {visible.map((s, i) => (
            <li
              key={`${s}-${i}`}
              className="px-2.5 py-1 text-[12px] text-black"
              style={{ background: FACE, ...BEVEL_OUT_THIN }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </ContentShell>
  )
}

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

function ContactContent({ t }: { t: (k: string) => string }) {
  const contacts = usePortfolioStore((s) => s.contacts)
  const visible = contacts.filter((c) => c.label.trim() || c.value.trim())
  return (
    <ContentShell title={t('content.contactTitle')} hint={t('content.contactHint')}>
      {visible.length === 0 ? (
        <p className="text-[13px] text-black/40">{t('desk.noContacts')}</p>
      ) : (
        <dl className="flex flex-col gap-2">
          {visible.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-2" style={{ ...BEVEL_IN_THIN }}>
              <dt className="text-[12px] font-bold uppercase tracking-wide text-black/60 w-24 shrink-0">
                {c.label}
              </dt>
              <dd className="text-[13px] tabular-nums break-all">
                {/^https?:\/\//.test(c.value) ? (
                  <a href={c.value} target="_blank" rel="noopener noreferrer" className="underline text-black/70">
                    {c.value}
                  </a>
                ) : (
                  c.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </ContentShell>
  )
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

function SettingsContent({
  user,
  lang,
  setLang,
  changePassword,
  t,
}: WindowContentsProps) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!current || !next || !confirm) {
      toast.error(t('term.errMissingFields'))
      return
    }
    if (next !== confirm) {
      toast.error(t('term.errPasswordMismatch'))
      return
    }
    setSubmitting(true)
    try {
      const res = await changePassword(current, next)
      if (res.ok) {
        toast.success(t('desk.passwordChanged'))
        setCurrent('')
        setNext('')
        setConfirm('')
      } else {
        const code = res.error ?? 'generic'
        let msg: string
        switch (code) {
          case 'invalid_current':
            msg = t('term.errInvalidCurrent')
            break
          case 'same_password':
            msg = t('term.errSamePassword')
            break
          case 'password_invalid':
            msg = t('term.errPasswordInvalid')
            break
          case 'missing_fields':
            msg = t('term.errMissingFields')
            break
          default:
            msg = t('term.errGeneric')
        }
        toast.error(msg)
      }
    } catch {
      toast.error(t('term.errGeneric'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ContentShell title={t('content.settingsTitle')} hint={t('content.settingsHint')}>
      {/* Account info */}
      <section className="mb-5">
        <SectionTitle>{t('desk.loggedInAs')}</SectionTitle>
        <div className="p-2 flex items-center gap-3" style={{ ...BEVEL_IN_THIN }}>
          <span className="text-[13px] font-bold">{user.username}</span>
          <span
            className="px-1.5 py-0.5 text-[10px] uppercase border border-black"
            style={{
              backgroundColor: user.isAdmin ? '#000' : '#fff',
              color: user.isAdmin ? '#fff' : '#000',
            }}
          >
            {user.isAdmin ? t('desk.adminBadge') : t('desk.userBadge')}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-black/50">{t('content.loginForever')}</p>
      </section>

      {/* Change password form */}
      <form onSubmit={onSubmit} className="mb-5">
        <SectionTitle>{t('desk.changePassword')}</SectionTitle>
        <div className="flex flex-col gap-2 max-w-md">
          <Field label={t('desk.currentPassword')}>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              className="w-full px-2 py-1 text-[13px] bg-white text-black outline-none"
              style={{ ...BEVEL_IN_THIN }}
            />
          </Field>
          <Field label={t('desk.newPassword')}>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              className="w-full px-2 py-1 text-[13px] bg-white text-black outline-none"
              style={{ ...BEVEL_IN_THIN }}
            />
          </Field>
          <Field label={t('desk.confirmNewPassword')}>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full px-2 py-1 text-[13px] bg-white text-black outline-none"
              style={{ ...BEVEL_IN_THIN }}
            />
          </Field>
          <div className="mt-1">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-[13px] font-bold text-black disabled:opacity-50 min-h-[36px]"
              style={{ background: FACE, ...BEVEL_OUT_THIN }}
            >
              {t('desk.save')}
            </button>
          </div>
        </div>
      </form>

      {/* Language toggle */}
      <section className="mb-5">
        <SectionTitle>{t('desk.language')}</SectionTitle>
        <div className="flex items-center gap-2">
          {(['en', 'ru'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className="px-3 py-1.5 text-[12px] min-h-[36px] text-black"
              style={
                lang === l
                  ? { background: '#000', color: '#fff', ...BEVEL_IN_THIN }
                  : { background: FACE, ...BEVEL_OUT_THIN }
              }
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </section>

      {/* Customization — available to everyone (client-side, per-browser) */}
      <CustomizationSection t={t} />

      {/* Admin toggles: guest access + instant approve */}
      {user.isAdmin && <AdminToggles t={t} />}

      {/* Content editor — admin only */}
      {user.isAdmin ? (
        <ContentEditor t={t} />
      ) : (
        <section>
          <SectionTitle>{t('desk.editContent')}</SectionTitle>
          <p className="text-[12px] text-black/50">
            {t('desk.adminOnly')}
          </p>
        </section>
      )}
    </ContentShell>
  )
}

/* ------------------------------------------------------------------ */
/* Customization (user-side, localStorage)                             */
/* ------------------------------------------------------------------ */

function CustomizationSection({ t }: { t: (k: string) => string }) {
  const { theme, fontSize, accent, setTheme, setFontSize, setAccent } = usePrefs()
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    applyPrefs(theme, fontSize, accent)
  }, [theme, fontSize, accent])

  const showSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <section className="mb-5">
      <SectionTitle>{t('desk.customization')}</SectionTitle>

      {/* Theme */}
      <SubBlock label={t('desk.theme')}>
        <div className="flex gap-2">
          {(['auto', 'light', 'dark'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => { setTheme(mode); showSaved() }}
              className="px-3 py-1.5 text-[12px] min-h-[32px]"
              style={theme === mode ? { background: '#000', color: '#fff' } : { background: FACE, ...BEVEL_OUT_THIN }}
            >
              {t(`desk.theme${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}
            </button>
          ))}
        </div>
      </SubBlock>

      {/* Font size */}
      <SubBlock label={t('desk.fontSize')}>
        <div className="flex gap-2">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => { setFontSize(size); showSaved() }}
              className="px-3 py-1.5 text-[12px] min-h-[32px]"
              style={fontSize === size ? { background: '#000', color: '#fff' } : { background: FACE, ...BEVEL_OUT_THIN }}
            >
              {t(`desk.fontSize${size.charAt(0).toUpperCase() + size.slice(1)}`)}
            </button>
          ))}
        </div>
      </SubBlock>

      {/* Accent color */}
      <SubBlock label={t('desk.accentColor')}>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={accent}
            onChange={(e) => { setAccent(e.target.value); showSaved() }}
            className="w-10 h-8 border border-black cursor-pointer"
          />
          <span className="text-[12px] tabular-nums">{accent}</span>
        </div>
      </SubBlock>

      {saved && <p className="text-[11px] text-black/50 mt-2">{t('desk.prefsSaved')}</p>}
      <p className="text-[10px] text-black/40 mt-2 italic">{t('desk.contentSavedAuto')}</p>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Admin toggles: guest access + instant approve                       */
/* ------------------------------------------------------------------ */

function AdminToggles({ t }: { t: (k: string) => string }) {
  const [guestAccess, setGuestAccess] = useState(false)
  const [instantApprove, setInstantApprove] = useState(false)

  useEffect(() => {
    void (async () => {
      const { isGuestAccessEnabled, isInstantApproveEnabled } = await import('@/contexts/auth-context')
      setGuestAccess(await isGuestAccessEnabled())
      setInstantApprove(await isInstantApproveEnabled())
    })()
  }, [])

  const toggleGuest = async () => {
    const next = !guestAccess
    setGuestAccess(next)
    try {
      const { db } = await import('@/lib/firebase')
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      await setDoc(doc(db, 'settings', 'guestAccess'), {
        enabled: next,
        updatedAt: serverTimestamp(),
      })
      toast.success(t('desk.prefsSaved'))
    } catch {
      setGuestAccess(!next)
      toast.error(t('term.errGeneric'))
    }
  }

  const toggleInstant = async () => {
    const next = !instantApprove
    setInstantApprove(next)
    try {
      const { db } = await import('@/lib/firebase')
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      await setDoc(doc(db, 'settings', 'instantApprove'), {
        enabled: next,
        updatedAt: serverTimestamp(),
      })
      toast.success(t('desk.prefsSaved'))
    } catch {
      setInstantApprove(!next)
      toast.error(t('term.errGeneric'))
    }
  }

  return (
    <section className="mb-5">
      <SectionTitle>{t('desk.settings')}</SectionTitle>

      {/* Guest access */}
      <div className="flex items-center justify-between gap-3 p-2 mb-2" style={{ ...BEVEL_IN_THIN }}>
        <div className="min-w-0">
          <div className="text-[13px] font-bold">{t('desk.guestAccess')}</div>
          <div className="text-[11px] text-black/50">{t('desk.guestAccessHint')}</div>
        </div>
        <button
          type="button"
          onClick={() => void toggleGuest()}
          className="relative w-12 h-6 shrink-0 transition-colors"
          style={{ background: guestAccess ? '#000' : '#bbb', ...BEVEL_IN_THIN }}
          aria-pressed={guestAccess}
        >
          <span
            className="absolute top-0.5 w-5 h-5 bg-white transition-transform"
            style={{ left: guestAccess ? '26px' : '2px' }}
          />
        </button>
      </div>

      {/* Instant approve */}
      <div className="flex items-center justify-between gap-3 p-2" style={{ ...BEVEL_IN_THIN }}>
        <div className="min-w-0">
          <div className="text-[13px] font-bold">{t('desk.instantApprove')}</div>
          <div className="text-[11px] text-black/50">{t('desk.instantApproveHint')}</div>
        </div>
        <button
          type="button"
          onClick={() => void toggleInstant()}
          className="relative w-12 h-6 shrink-0 transition-colors"
          style={{ background: instantApprove ? '#000' : '#bbb', ...BEVEL_IN_THIN }}
          aria-pressed={instantApprove}
        >
          <span
            className="absolute top-0.5 w-5 h-5 bg-white transition-transform"
            style={{ left: instantApprove ? '26px' : '2px' }}
          />
        </button>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Content editor (admin only)                                         */
/* ------------------------------------------------------------------ */

function ContentEditor({ t }: { t: (k: string) => string }) {
  const aboutBody = usePortfolioStore((s) => s.aboutBody)
  const setAboutBody = usePortfolioStore((s) => s.setAboutBody)
  const projects = usePortfolioStore((s) => s.projects)
  const setProject = usePortfolioStore((s) => s.setProject)
  const addProject = usePortfolioStore((s) => s.addProject)
  const removeProject = usePortfolioStore((s) => s.removeProject)
  const skills = usePortfolioStore((s) => s.skills)
  const setSkills = usePortfolioStore((s) => s.setSkills)
  const contacts = usePortfolioStore((s) => s.contacts)
  const setContact = usePortfolioStore((s) => s.setContact)
  const addContact = usePortfolioStore((s) => s.addContact)
  const removeContact = usePortfolioStore((s) => s.removeContact)
  const resetAll = usePortfolioStore((s) => s.resetAll)

  const onReset = () => {
    if (typeof window !== 'undefined' && window.confirm(t('desk.resetConfirm'))) {
      resetAll()
      toast.success(t('desk.contentSaved'))
    }
  }

  return (
    <section>
      <SectionTitle>{t('desk.editContent')}</SectionTitle>
      <p className="text-[11px] text-black/50 mb-3">{t('desk.contentSavedAuto')}</p>

      {/* About */}
      <SubBlock label={t('desk.editAbout')}>
        <textarea
          value={aboutBody}
          onChange={(e) => setAboutBody(e.target.value)}
          rows={5}
          className="w-full px-2 py-1 text-[13px] leading-relaxed bg-white text-black outline-none resize-y"
          style={{ ...BEVEL_IN_THIN }}
        />
      </SubBlock>

      {/* Projects */}
      <SubBlock label={t('desk.editProjects')}>
        <div className="flex flex-col gap-3">
          {projects.length === 0 ? (
            <p className="text-[12px] text-black/50">{t('desk.noProjects')}</p>
          ) : (
            projects.map((p, i) => (
              <div key={p.id} className="p-2 bg-white" style={{ ...BEVEL_IN_THIN }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] tabular-nums text-black/50">#{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeProject(p.id)}
                    className="px-2 py-0.5 text-[11px] text-black min-h-[28px]"
                    style={{ background: FACE, ...BEVEL_OUT_THIN }}
                  >
                    {t('desk.removeProject')}
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  <Field label={t('desk.projectTitle')}>
                    <input
                      type="text"
                      value={p.title}
                      onChange={(e) => setProject(p.id, { title: e.target.value })}
                      className="w-full px-2 py-1 text-[13px] bg-white text-black outline-none"
                      style={{ ...BEVEL_IN_THIN }}
                    />
                  </Field>
                  <Field label={t('desk.projectDesc')}>
                    <textarea
                      value={p.description}
                      onChange={(e) => setProject(p.id, { description: e.target.value })}
                      rows={2}
                      className="w-full px-2 py-1 text-[13px] leading-relaxed bg-white text-black outline-none resize-y"
                      style={{ ...BEVEL_IN_THIN }}
                    />
                  </Field>
                  <Field label={t('desk.projectLink')}>
                    <input
                      type="text"
                      value={p.link}
                      onChange={(e) => setProject(p.id, { link: e.target.value })}
                      placeholder="https://"
                      className="w-full px-2 py-1 text-[13px] bg-white text-black outline-none"
                      style={{ ...BEVEL_IN_THIN }}
                    />
                  </Field>
                </div>
              </div>
            ))
          )}
          <div>
            <button
              type="button"
              onClick={() => {
                addProject()
                toast.success(t('desk.contentSaved'))
              }}
              className="px-3 py-1.5 text-[12px] font-bold text-black min-h-[32px]"
              style={{ background: FACE, ...BEVEL_OUT_THIN }}
            >
              + {t('desk.addProject')}
            </button>
          </div>
        </div>
      </SubBlock>

      {/* Skills */}
      <SubBlock label={t('desk.editSkills')}>
        <textarea
          value={skills.join('\n')}
          onChange={(e) => setSkills(e.target.value.split('\n'))}
          rows={5}
          className="w-full px-2 py-1 text-[13px] leading-relaxed bg-white text-black outline-none resize-y"
          style={{ ...BEVEL_IN_THIN }}
        />
      </SubBlock>

      {/* Contacts */}
      <SubBlock label={t('desk.editContacts')}>
        <div className="flex flex-col gap-3">
          {contacts.length === 0 ? (
            <p className="text-[12px] text-black/50">{t('desk.noContacts')}</p>
          ) : (
            contacts.map((c, i) => (
              <div key={c.id} className="p-2 bg-white" style={{ ...BEVEL_IN_THIN }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] tabular-nums text-black/50">#{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeContact(c.id)}
                    className="px-2 py-0.5 text-[11px] text-black min-h-[28px]"
                    style={{ background: FACE, ...BEVEL_OUT_THIN }}
                  >
                    {t('desk.removeContact')}
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  <Field label={t('desk.contactLabel')}>
                    <input
                      type="text"
                      value={c.label}
                      onChange={(e) => setContact(c.id, { label: e.target.value })}
                      className="w-full px-2 py-1 text-[13px] bg-white text-black outline-none"
                      style={{ ...BEVEL_IN_THIN }}
                    />
                  </Field>
                  <Field label={t('desk.contactValue')}>
                    <input
                      type="text"
                      value={c.value}
                      onChange={(e) => setContact(c.id, { value: e.target.value })}
                      className="w-full px-2 py-1 text-[13px] bg-white text-black outline-none"
                      style={{ ...BEVEL_IN_THIN }}
                    />
                  </Field>
                </div>
              </div>
            ))
          )}
          <div>
            <button
              type="button"
              onClick={() => {
                addContact()
                toast.success(t('desk.contentSaved'))
              }}
              className="px-3 py-1.5 text-[12px] font-bold text-black min-h-[32px]"
              style={{ background: FACE, ...BEVEL_OUT_THIN }}
            >
              + {t('desk.addContact')}
            </button>
          </div>
        </div>
      </SubBlock>

      {/* Reset */}
      <div className="mt-4 pt-3 border-t border-black/15">
        <button
          type="button"
          onClick={onReset}
          className="px-3 py-1.5 text-[12px] text-black min-h-[32px]"
          style={{ background: '#fff', ...BEVEL_OUT_THIN }}
        >
          {t('desk.resetDefaults')}
        </button>
      </div>
    </section>
  )
}

function SubBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <h4 className="text-[11px] font-bold uppercase tracking-wide text-black/50 mb-2">{label}</h4>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12px] text-black/70">{label}</span>
      {children}
    </label>
  )
}

/* ------------------------------------------------------------------ */
/* Analytics (admin only)                                              */
/* ------------------------------------------------------------------ */

interface ViewerRow {
  uid: string
  username: string
  views: number
  lastSeen?: { toMillis?: () => number } | string | null
}

interface PendingRow {
  uid: string
  username: string
  status: string
  createdAt?: { toMillis?: () => number } | string | null
}

function tsToIso(ts: { toMillis?: () => number } | string | null | undefined): string {
  if (!ts) return ''
  if (typeof ts === 'string') return ts
  if (typeof ts === 'object' && ts && typeof ts.toMillis === 'function') {
    return new Date(ts.toMillis()).toISOString()
  }
  return ''
}

function fmtDate(iso: string): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch {
    return iso
  }
}

function ChatContent({ t, user }: { t: (k: string) => string; user: AuthUser }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Subscribe to real-time messages + cleanup expired ones on mount.
  useEffect(() => {
    const unsub = subscribeToChat(
      (msgs) => setMessages(msgs),
      () => setMessages([]),
    )
    void cleanupExpiredMessages()
    return unsub
  }, [])

  // Cooldown ticker — update every second.
  useEffect(() => {
    const id = setInterval(() => {
      setCooldown(cooldownRemaining())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sending || cooldown > 0) return
    setSending(true)
    const res = await sendChatMessage(user.id, user.username, input, user.badge)
    if (res.ok) {
      setInput('')
      setCooldown(cooldownRemaining())
    } else {
      const msg = res.error === 'cooldown'
        ? t('desk.chatCooldown').replace('{sec}', String(Math.ceil(cooldownRemaining() / 1000)))
        : res.error === 'too_long'
          ? t('desk.chatTooLong')
          : t('desk.chatError')
      toast.error(msg)
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full max-h-[60vh]">
      {/* Header */}
      <div className="px-4 py-2 border-b border-black/15 flex items-center justify-between shrink-0">
        <h2 className="text-[14px] font-bold">{t('desk.chat')}</h2>
        <span className="text-[10px] text-black/40">{t('desk.chatCleared')}</span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5 min-h-[200px]"
      >
        {messages.length === 0 ? (
          <p className="text-[12px] text-black/40 italic m-auto">{t('desk.chatEmpty')}</p>
        ) : (
          messages.map((m) => {
            const isMe = m.uid === user.id
            const ts = m.createdAt && typeof m.createdAt === 'object' && m.createdAt.toMillis
              ? new Date(m.createdAt.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : ''
            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
              >
                {!isMe && (
                  <span className="text-[10px] font-bold text-black/50 mb-0.5 px-1 flex items-center gap-1">
                    {m.username}
                    {m.badge && (
                      <span className="px-1 text-[8px] uppercase border border-black/40 bg-white text-black">{m.badge}</span>
                    )}
                  </span>
                )}
                <div
                  className="px-2.5 py-1.5 text-[13px] break-words whitespace-pre-line"
                  style={
                    isMe
                      ? { background: '#000', color: '#fff' }
                      : { background: '#fff', ...BEVEL_IN_THIN }
                  }
                >
                  {m.text}
                </div>
                {ts && <span className="text-[9px] text-black/30 mt-0.5 px-1">{ts}</span>}
              </div>
            )
          })
        )}
      </div>

      {/* Input */}
      <form onSubmit={onSend} className="px-3 py-2 border-t border-black/15 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={cooldown > 0 ? t('desk.chatCooldown').replace('{sec}', String(Math.ceil(cooldown / 1000))) : t('desk.chatPlaceholder')}
          disabled={cooldown > 0 || sending}
          maxLength={500}
          className="flex-1 px-2 py-1.5 text-[13px] bg-white text-black outline-none disabled:opacity-50"
          style={{ ...BEVEL_IN_THIN }}
        />
        <button
          type="submit"
          disabled={cooldown > 0 || sending || !input.trim()}
          className="px-3 py-1.5 text-[12px] font-bold text-black disabled:opacity-50 min-h-[36px] shrink-0"
          style={{ background: FACE, ...BEVEL_OUT_THIN }}
        >
          {t('desk.chatSend')}
        </button>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Minigames (Snake + 2048)                                            */
/* ------------------------------------------------------------------ */

function MinigamesContent({ t }: { t: (k: string) => string }) {
  const [game, setGame] = useState<'snake' | '2048'>('snake')
  return (
    <ContentShell title={t('desk.minigames')}>
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setGame('snake')}
          className="px-3 py-1.5 text-[12px] font-bold min-h-[32px]"
          style={game === 'snake' ? { background: '#000', color: '#fff' } : { background: '#fff', ...BEVEL_OUT_THIN }}
        >
          {t('desk.snake')}
        </button>
        <button
          type="button"
          onClick={() => setGame('2048')}
          className="px-3 py-1.5 text-[12px] font-bold min-h-[32px]"
          style={game === '2048' ? { background: '#000', color: '#fff' } : { background: '#fff', ...BEVEL_OUT_THIN }}
        >
          {t('desk.game2048')}
        </button>
      </div>
      <div className="flex justify-center py-4">
        {game === 'snake' ? <SnakeGame /> : <Game2048 />}
      </div>
    </ContentShell>
  )
}
