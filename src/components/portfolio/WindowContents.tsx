'use client'

import { useEffect, useState, type ReactNode } from 'react'
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
    case 'analytics':
      return <AnalyticsContent t={props.t} user={props.user} />
    case 'console':
      return <ConsoleContent t={props.t} user={props.user} />
    case 'devices':
      return <DevicesContent t={props.t} user={props.user} />
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

function AnalyticsContent({ t, user }: { t: (k: string) => string; user: AuthUser }) {
  const [totalViews, setTotalViews] = useState<number | null>(null)
  const [viewers, setViewers] = useState<ViewerRow[]>([])
  const [pending, setPending] = useState<PendingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const load = async () => {
    const { db } = await import('@/lib/firebase')
    const { doc, getDoc, collection, getDocs } = await import('firebase/firestore')

    // Total views — independent (best-effort).
    try {
      const cSnap = await getDoc(doc(db, 'analytics', 'portfolio'))
      setTotalViews(cSnap.exists() ? (cSnap.data().totalViews ?? 0) : 0)
    } catch {
      setTotalViews(0)
    }

    // Viewers list — independent. No orderBy (avoids needing a composite
    // index; we sort client-side instead).
    try {
      const vSnap = await getDocs(collection(db, 'viewers'))
      const vRows: ViewerRow[] = []
      vSnap.forEach((d) => {
        const data = d.data() as ViewerRow
        vRows.push({ ...data, uid: d.id })
      })
      // Sort by lastSeen descending (client-side).
      vRows.sort((a, b) => {
        const ta = new Date(tsToIso(a.lastSeen)).getTime() || 0
        const tb = new Date(tsToIso(b.lastSeen)).getTime() || 0
        return tb - ta
      })
      setViewers(vRows)
    } catch {
      setViewers([])
    }

    // Pending users — independent.
    try {
      const uSnap = await getDocs(collection(db, 'users'))
      const pRows: PendingRow[] = []
      uSnap.forEach((d) => {
        const data = d.data() as PendingRow
        if (data.status === 'pending') {
          pRows.push({ ...data, uid: d.id })
        }
      })
      setPending(pRows)
    } catch {
      setPending([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const setStatus = async (uid: string, status: 'approved' | 'rejected') => {
    setActing(uid)
    try {
      const { db } = await import('@/lib/firebase')
      const { doc, updateDoc } = await import('firebase/firestore')
      await updateDoc(doc(db, 'users', uid), { status })
      toast.success(status === 'approved' ? t('desk.approved') : t('desk.rejected'))
      setPending((prev) => prev.filter((p) => p.uid !== uid))
    } catch {
      toast.error(t('term.errGeneric'))
    } finally {
      setActing(null)
    }
  }

  if (!user.isAdmin) {
    return (
      <ContentShell title={t('desk.analytics')}>
        <p className="text-[12px] text-black/50">{t('desk.adminOnly')}</p>
      </ContentShell>
    )
  }

  const uniqueViewers = viewers.length

  return (
    <ContentShell title={t('desk.analytics')}>
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-3" style={{ ...BEVEL_IN_THIN }}>
          <div className="text-[11px] uppercase tracking-wide text-black/50">{t('desk.totalViews')}</div>
          <div className="text-[26px] font-bold tabular-nums mt-1">
            {totalViews === null ? '…' : totalViews}
          </div>
        </div>
        <div className="p-3" style={{ ...BEVEL_IN_THIN }}>
          <div className="text-[11px] uppercase tracking-wide text-black/50">{t('desk.uniqueViewers')}</div>
          <div className="text-[26px] font-bold tabular-nums mt-1">{uniqueViewers}</div>
        </div>
      </div>

      {/* Approvals */}
      <SectionTitle>{t('desk.approvals')}</SectionTitle>
      {loading ? (
        <p className="text-[12px] text-black/40">…</p>
      ) : pending.length === 0 ? (
        <p className="text-[12px] text-black/50">{t('desk.noPending')}</p>
      ) : (
        <ul className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {pending.map((p) => (
            <li key={p.uid} className="p-2 flex items-center justify-between gap-2" style={{ ...BEVEL_IN_THIN }}>
              <div className="min-w-0">
                <div className="text-[13px] font-bold truncate">{p.username}</div>
                <div className="text-[10px] text-black/40">
                  {t('desk.appliedAt')}: {fmtDate(tsToIso(p.createdAt))}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={acting === p.uid}
                  onClick={() => void setStatus(p.uid, 'approved')}
                  className="px-2 py-1 text-[11px] font-bold text-black min-h-[28px] disabled:opacity-50"
                  style={{ background: FACE, ...BEVEL_OUT_THIN }}
                >
                  {t('desk.approve')}
                </button>
                <button
                  type="button"
                  disabled={acting === p.uid}
                  onClick={() => void setStatus(p.uid, 'rejected')}
                  className="px-2 py-1 text-[11px] text-black min-h-[28px] disabled:opacity-50"
                  style={{ background: '#fff', ...BEVEL_OUT_THIN }}
                >
                  {t('desk.reject')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Recent viewers */}
      <SectionTitle>{t('desk.recentViewers')}</SectionTitle>
      {loading ? (
        <p className="text-[12px] text-black/40">…</p>
      ) : viewers.length === 0 ? (
        <p className="text-[12px] text-black/50">{t('desk.noViewers')}</p>
      ) : (
        <ul className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {viewers.map((v) => (
            <li key={v.uid} className="px-2 py-1 flex items-center justify-between gap-2 text-[12px]">
              <span className="font-bold truncate">{v.username || '—'}</span>
              <span className="text-black/50 shrink-0 tabular-nums">
                {v.views ?? 0} {t('desk.views')}
              </span>
              <span className="text-black/40 text-[10px] shrink-0">
                {fmtDate(tsToIso(v.lastSeen))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </ContentShell>
  )
}

/* ------------------------------------------------------------------ */
/* Console (admin only) — create verified users + auto-approval delay  */
/* ------------------------------------------------------------------ */

function ConsoleContent({ t, user }: { t: (k: string) => string; user: AuthUser }) {
  // Create verified user form state
  const [cuUsername, setCuUsername] = useState('')
  const [cuPassword, setCuPassword] = useState('')
  const [cuConfirm, setCuConfirm] = useState('')
  const [cuBusy, setCuBusy] = useState(false)

  // Auto-approval delay state
  const [delay, setDelay] = useState<number>(0)
  const [delayInput, setDelayInput] = useState('0')
  const [delayBusy, setDelayBusy] = useState(false)
  const [delayLoaded, setDelayLoaded] = useState(false)

  // Load current delay once.
  useEffect(() => {
    void (async () => {
      try {
        const { getAutoApprovalDelay } = await import('@/contexts/auth-context')
        const d = await getAutoApprovalDelay()
        setDelay(d)
        setDelayInput(String(d))
      } catch {
        // ignore
      } finally {
        setDelayLoaded(true)
      }
    })()
  }, [])

  const onCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cuUsername || !cuPassword || !cuConfirm) {
      toast.error(t('term.errMissingFields'))
      return
    }
    if (cuPassword !== cuConfirm) {
      toast.error(t('term.errPasswordMismatch'))
      return
    }
    if (cuPassword.length < 6) {
      toast.error(t('term.errPasswordInvalid'))
      return
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cuUsername)) {
      toast.error(t('term.errUsernameInvalid'))
      return
    }
    setCuBusy(true)
    try {
      const { adminCreateUser, db } = await import('@/lib/firebase')
      const { doc, setDoc, getDoc, serverTimestamp } = await import('firebase/firestore')

      // Pre-check username uniqueness.
      const nameSnap = await getDoc(doc(db, 'usernames', cuUsername.toLowerCase()))
      if (nameSnap.exists()) {
        toast.error(t('term.errUsernameTaken'))
        setCuBusy(false)
        return
      }

      // Create the Auth user (secondary app — admin stays logged in).
      const uid = await adminCreateUser(cuUsername, cuPassword)

      // Write profile as approved + username map.
      await setDoc(doc(db, 'users', uid), {
        username: cuUsername,
        isAdmin: false,
        status: 'approved',
        createdAt: serverTimestamp(),
      })
      await setDoc(doc(db, 'usernames', cuUsername.toLowerCase()), {
        uid,
        createdAt: serverTimestamp(),
      })

      toast.success(t('desk.userCreated'))
      setCuUsername('')
      setCuPassword('')
      setCuConfirm('')
    } catch (err) {
      const code = (err as { code?: string })?.code ?? ''
      if (code === 'auth/email-already-in-use') {
        toast.error(t('term.errUsernameTaken'))
      } else if (code === 'auth/weak-password') {
        toast.error(t('term.errPasswordInvalid'))
      } else {
        toast.error(t('term.errGeneric'))
      }
    } finally {
      setCuBusy(false)
    }
  }

  const onSaveDelay = async () => {
    const n = Math.max(0, Math.floor(Number(delayInput) || 0))
    setDelayBusy(true)
    try {
      const { db } = await import('@/lib/firebase')
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      await setDoc(doc(db, 'settings', 'autoApproval'), {
        delayMinutes: n,
        updatedAt: serverTimestamp(),
      })
      setDelay(n)
      toast.success(t('desk.delaySaved'))
    } catch {
      toast.error(t('term.errGeneric'))
    } finally {
      setDelayBusy(false)
    }
  }

  if (!user.isAdmin) {
    return (
      <ContentShell title={t('desk.console')}>
        <p className="text-[12px] text-black/50">{t('desk.adminOnly')}</p>
      </ContentShell>
    )
  }

  return (
    <ContentShell title={t('desk.console')}>
      {/* Create verified user */}
      <form onSubmit={onCreateUser} className="mb-6">
        <SectionTitle>{t('desk.createUser')}</SectionTitle>
        <div className="flex flex-col gap-2 max-w-md">
          <Field label={t('term.username')}>
            <input
              type="text"
              value={cuUsername}
              onChange={(e) => setCuUsername(e.target.value)}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full px-2 py-1 text-[13px] bg-white text-black outline-none"
              style={{ ...BEVEL_IN_THIN }}
            />
          </Field>
          <Field label={t('term.password')}>
            <input
              type="password"
              value={cuPassword}
              onChange={(e) => setCuPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full px-2 py-1 text-[13px] bg-white text-black outline-none"
              style={{ ...BEVEL_IN_THIN }}
            />
          </Field>
          <Field label={t('term.confirmPassword')}>
            <input
              type="password"
              value={cuConfirm}
              onChange={(e) => setCuConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full px-2 py-1 text-[13px] bg-white text-black outline-none"
              style={{ ...BEVEL_IN_THIN }}
            />
          </Field>
          <div className="mt-1">
            <button
              type="submit"
              disabled={cuBusy}
              className="px-4 py-1.5 text-[13px] font-bold text-black disabled:opacity-50 min-h-[36px]"
              style={{ background: FACE, ...BEVEL_OUT_THIN }}
            >
              {t('desk.createUser')}
            </button>
          </div>
        </div>
      </form>

      {/* Auto-approval delay */}
      <section>
        <SectionTitle>{t('desk.autoApproval')}</SectionTitle>
        <p className="text-[11px] text-black/50 mb-3 max-w-md">{t('desk.autoApprovalHint')}</p>
        <div className="flex flex-wrap items-center gap-2 max-w-md">
          <input
            type="number"
            min={0}
            value={delayInput}
            onChange={(e) => setDelayInput(e.target.value)}
            disabled={!delayLoaded}
            className="w-24 px-2 py-1 text-[13px] bg-white text-black outline-none tabular-nums"
            style={{ ...BEVEL_IN_THIN }}
          />
          <span className="text-[12px] text-black/60">{t('desk.delayMinutes')}</span>
          <button
            type="button"
            onClick={() => void onSaveDelay()}
            disabled={delayBusy || !delayLoaded}
            className="px-3 py-1.5 text-[12px] font-bold text-black disabled:opacity-50 min-h-[32px]"
            style={{ background: FACE, ...BEVEL_OUT_THIN }}
          >
            {t('desk.saveDelay')}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-black/50">
          {delay > 0
            ? `${t('desk.autoApproval')}: ${delay} ${t('desk.delayMinutes')}`
            : t('desk.autoApprovalOff')}
        </p>
      </section>
    </ContentShell>
  )
}

/* ------------------------------------------------------------------ */
/* Devices (admin only) — login history with device + location         */
/* ------------------------------------------------------------------ */

interface LoginDoc {
  uid: string
  username: string
  userAgent: string
  platform?: string
  ip: string
  country: string
  city: string
  timestamp?: { toMillis?: () => number } | string | null
}

function DevicesContent({ t, user }: { t: (k: string) => string; user: AuthUser }) {
  const [logins, setLogins] = useState<LoginDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const { db } = await import('@/lib/firebase')
        const { collection, getDocs, query, orderBy, limit } = await import('firebase/firestore')
        // Admin can read all users; for each user, read their logins subcollection.
        const usersSnap = await getDocs(collection(db, 'users'))
        const all: LoginDoc[] = []
        for (const uDoc of usersSnap.docs) {
          try {
            const lSnap = await getDocs(
              query(collection(db, 'users', uDoc.id, 'logins'), orderBy('timestamp', 'desc'), limit(5)),
            )
            lSnap.forEach((d) => {
              all.push(d.data() as LoginDoc)
            })
          } catch {
            // skip this user's logins
          }
        }
        // Sort all logins by timestamp desc (client-side)
        all.sort((a, b) => {
          const ta = a.timestamp && typeof a.timestamp === 'object' && a.timestamp.toMillis ? a.timestamp.toMillis() : 0
          const tb = b.timestamp && typeof b.timestamp === 'object' && b.timestamp.toMillis ? b.timestamp.toMillis() : 0
          return tb - ta
        })
        setLogins(all.slice(0, 50))
      } catch {
        // permission denied (non-admin)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (!user.isAdmin) {
    return (
      <ContentShell title={t('desk.devices')}>
        <p className="text-[12px] text-black/50">{t('desk.adminOnly')}</p>
      </ContentShell>
    )
  }

  return (
    <ContentShell title={t('desk.devices')}>
      <SectionTitle>{t('desk.recentLogins')}</SectionTitle>
      {loading ? (
        <p className="text-[12px] text-black/40">…</p>
      ) : logins.length === 0 ? (
        <p className="text-[12px] text-black/50">{t('desk.noLogins')}</p>
      ) : (
        <ul className="flex flex-col gap-1 max-h-80 overflow-y-auto">
          {logins.map((l, i) => {
            const ts = l.timestamp && typeof l.timestamp === 'object' && l.timestamp.toMillis
              ? new Date(l.timestamp.toMillis()).toLocaleString()
              : '—'
            return (
              <li
                key={i}
                className="px-2 py-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] border-b border-black/10"
              >
                <span className="font-bold min-w-[80px]">{l.username || '—'}</span>
                <span className="text-black/60 min-w-[120px]">{l.userAgent || '—'}</span>
                <span className="text-black/50">
                  {l.city}, {l.country}
                </span>
                <span className="text-black/40 tabular-nums ml-auto">{ts}</span>
              </li>
            )
          })}
        </ul>
      )}
    </ContentShell>
  )
}
