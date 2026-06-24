'use client'

import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { Lang } from '@/lib/i18n'
import type { AuthUser } from '@/contexts/auth-context'
import type { WindowId } from './types'
import { BEVEL_IN_THIN, BEVEL_OUT_THIN, FACE } from './types'

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

/* ------------------------------------------------------------------ */
/* About                                                               */
/* ------------------------------------------------------------------ */

function AboutContent({ t }: { t: (k: string) => string }) {
  return (
    <ContentShell title={t('content.aboutTitle')} hint={t('content.aboutHint')}>
      <p className="text-[14px] leading-relaxed whitespace-pre-line">{t('content.aboutBody')}</p>
    </ContentShell>
  )
}

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

function ProjectsContent({ t }: { t: (k: string) => string }) {
  const projects: Array<{ titleKey: string; descKey: string }> = [
    { titleKey: 'content.project1Title', descKey: 'content.project1Desc' },
    { titleKey: 'content.project2Title', descKey: 'content.project2Desc' },
    { titleKey: 'content.project3Title', descKey: 'content.project3Desc' },
  ]
  return (
    <ContentShell title={t('content.projectsTitle')} hint={t('content.projectsHint')}>
      <ul className="flex flex-col gap-3">
        {projects.map((p, i) => (
          <li
            key={p.titleKey}
            className="p-3 bg-white"
            style={{ ...BEVEL_IN_THIN }}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] tabular-nums text-black/50">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="text-[14px] font-bold">{t(p.titleKey)}</h3>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-black/80">{t(p.descKey)}</p>
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
  // Plain-text skill chips — the owner can edit this list directly.
  const skills = ['React', 'TypeScript', 'Node.js', 'Design', 'Next.js', 'Tailwind']
  return (
    <ContentShell title={t('content.skillsTitle')} hint={t('content.skillsHint')}>
      <ul className="flex flex-wrap gap-2">
        {skills.map((s) => (
          <li
            key={s}
            className="px-2.5 py-1 text-[12px] text-black"
            style={{ background: FACE, ...BEVEL_OUT_THIN }}
          >
            {s}
          </li>
        ))}
      </ul>
    </ContentShell>
  )
}

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

function ContactContent({ t }: { t: (k: string) => string }) {
  const rows: Array<{ labelKey: string; valueKey: string }> = [
    { labelKey: 'content.emailLabel', valueKey: 'content.emailValue' },
    { labelKey: 'content.githubLabel', valueKey: 'content.githubValue' },
  ]
  return (
    <ContentShell title={t('content.contactTitle')} hint={t('content.contactHint')}>
      <dl className="flex flex-col gap-2">
        {rows.map((r) => (
          <div
            key={r.labelKey}
            className="flex items-center gap-3 p-2"
            style={{ ...BEVEL_IN_THIN }}
          >
            <dt className="text-[12px] font-bold uppercase tracking-wide text-black/60 w-20 shrink-0">
              {t(r.labelKey)}
            </dt>
            <dd className="text-[13px] tabular-nums break-all">{t(r.valueKey)}</dd>
          </div>
        ))}
      </dl>
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
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-black/60 mb-2">
          {t('desk.loggedInAs')}
        </h3>
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
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-black/60 mb-2">
          {t('desk.changePassword')}
        </h3>
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
      <section>
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-black/60 mb-2">
          {t('desk.language')}
        </h3>
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
    </ContentShell>
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
