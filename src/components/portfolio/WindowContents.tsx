'use client'

import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { Lang } from '@/lib/i18n'
import type { AuthUser } from '@/contexts/auth-context'
import { usePortfolioStore } from '@/lib/portfolio-store'
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
