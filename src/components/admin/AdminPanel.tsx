'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { collection, getDocs, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ACCENT } from '@/components/portfolio/types'
import { toast } from 'sonner'

interface AdminPanelProps {
  onSwitchToPortfolio: () => void
}

interface UserRow {
  uid: string
  username: string
  isAdmin: boolean
  status: string
  badge?: string
  blocked?: boolean
  isGuest?: boolean
  createdAt?: { toMillis?: () => number } | string | null
}

interface ViewerRow {
  uid: string
  username: string
  views: number
  lastSeen?: { toMillis?: () => number } | string | null
}

interface LoginDoc {
  username: string
  userAgent: string
  ip: string
  country: string
  city: string
  timestamp?: { toMillis?: () => number } | string | null
}

function tsToMs(ts: unknown): number {
  if (!ts) return 0
  if (typeof ts === 'string') return new Date(ts).getTime() || 0
  if (typeof ts === 'object' && ts && typeof (ts as { toMillis?: () => number }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis()
  }
  return 0
}

export default function AdminPanel({ onSwitchToPortfolio }: AdminPanelProps) {
  const { user, logout } = useAuth()
  const { t, lang, setLang } = useLanguage()
  const [users, setUsers] = useState<UserRow[]>([])
  const [viewers, setViewers] = useState<ViewerRow[]>([])
  const [logins, setLogins] = useState<LoginDoc[]>([])
  const [totalViews, setTotalViews] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'users' | 'analytics' | 'console' | 'devices'>('users')
  const [editingBadge, setEditingBadge] = useState<string | null>(null)
  const [badgeValue, setBadgeValue] = useState('')

  // Console state
  const [cuUsername, setCuUsername] = useState('')
  const [cuPassword, setCuPassword] = useState('')
  const [cuConfirm, setCuConfirm] = useState('')
  const [cuSubmitting, setCuSubmitting] = useState(false)
  const [delay, setDelay] = useState(0)
  const [guestAccess, setGuestAccess] = useState(false)
  const [instantApprove, setInstantApprove] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        // Users
        const uSnap = await getDocs(collection(db, 'users'))
        if (cancelled) return
        const uRows: UserRow[] = []
        uSnap.forEach((d) => uRows.push({ ...(d.data() as UserRow), uid: d.id }))
        uRows.sort((a, b) => {
          if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1
          return a.username.localeCompare(b.username)
        })
        setUsers(uRows)

        // Viewers
        try {
          const vSnap = await getDocs(collection(db, 'viewers'))
          const vRows: ViewerRow[] = []
          vSnap.forEach((d) => vRows.push({ ...(d.data() as ViewerRow), uid: d.id }))
          vRows.sort((a, b) => tsToMs(b.lastSeen) - tsToMs(a.lastSeen))
          setViewers(vRows)
        } catch { /* ignore */ }

        // Total views
        try {
          const { getDoc } = await import('firebase/firestore')
          const cSnap = await getDoc(doc(db, 'analytics', 'portfolio'))
          setTotalViews(cSnap.exists() ? (cSnap.data().totalViews ?? 0) : 0)
        } catch { /* ignore */ }

        // Recent logins (from all users' logins subcollections)
        const lRows: LoginDoc[] = []
        for (const u of uRows.slice(0, 20)) {
          try {
            const lSnap = await getDocs(collection(db, 'users', u.uid, 'logins'))
            lSnap.forEach((d) => lRows.push(d.data() as LoginDoc))
          } catch { /* skip */ }
        }
        lRows.sort((a, b) => tsToMs(b.timestamp) - tsToMs(a.timestamp))
        setLogins(lRows.slice(0, 30))

        // Settings
        const { getDoc: gd } = await import('firebase/firestore')
        try {
          const dSnap = await gd(doc(db, 'settings', 'autoApproval'))
          if (dSnap.exists()) setDelay(dSnap.data().delayMinutes ?? 0)
        } catch { /* ignore */ }
        try {
          const gSnap = await gd(doc(db, 'settings', 'guestAccess'))
          if (gSnap.exists()) setGuestAccess(gSnap.data().enabled === true)
        } catch { /* ignore */ }
        try {
          const iSnap = await gd(doc(db, 'settings', 'instantApprove'))
          if (iSnap.exists()) setInstantApprove(iSnap.data().enabled === true)
        } catch { /* ignore */ }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const toggleBlock = async (u: UserRow) => {
    try {
      const next = !u.blocked
      await updateDoc(doc(db, 'users', u.uid), { blocked: next })
      setUsers((prev) => prev.map((x) => (x.uid === u.uid ? { ...x, blocked: next } : x)))
      toast.success(next ? t('desk.userBlocked') : t('desk.userUnblocked'))
    } catch { toast.error(t('term.errGeneric')) }
  }

  const saveBadge = async (u: UserRow) => {
    try {
      const val = badgeValue.trim()
      await updateDoc(doc(db, 'users', u.uid), { badge: val || null })
      setUsers((prev) => prev.map((x) => (x.uid === u.uid ? { ...x, badge: val || undefined } : x)))
      setEditingBadge(null)
      setBadgeValue('')
      toast.success(t('desk.badgeSaved'))
    } catch { toast.error(t('term.errGeneric')) }
  }

  const approveUser = async (u: UserRow) => {
    try {
      await updateDoc(doc(db, 'users', u.uid), { status: 'approved' })
      setUsers((prev) => prev.map((x) => (x.uid === u.uid ? { ...x, status: 'approved' } : x)))
      toast.success(t('desk.approved'))
    } catch { toast.error(t('term.errGeneric')) }
  }

  // Console: create verified user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cuPassword !== cuConfirm) { toast.error(t('term.errPasswordMismatch')); return }
    if (cuPassword.length < 6) { toast.error(t('term.errPasswordInvalid')); return }
    setCuSubmitting(true)
    try {
      const { adminCreateUser } = await import('@/lib/firebase')
      const uid = await adminCreateUser(cuUsername, cuPassword)
      await setDoc(doc(db, 'users', uid), {
        username: cuUsername,
        isAdmin: false,
        status: 'approved',
        createdAt: serverTimestamp(),
      })
      await setDoc(doc(db, 'usernames', cuUsername.toLowerCase()), { uid, createdAt: serverTimestamp() })
      toast.success(t('desk.userCreated'))
      setCuUsername(''); setCuPassword(''); setCuConfirm('')
      // Reload users
      const snap = await getDocs(collection(db, 'users'))
      const rows: UserRow[] = []
      snap.forEach((d) => rows.push({ ...(d.data() as UserRow), uid: d.id }))
      rows.sort((a, b) => (a.isAdmin !== b.isAdmin ? (a.isAdmin ? -1 : 1) : a.username.localeCompare(b.username)))
      setUsers(rows)
    } catch { toast.error(t('term.errGeneric')) }
    setCuSubmitting(false)
  }

  const saveDelay = async () => {
    try {
      await setDoc(doc(db, 'settings', 'autoApproval'), { delayMinutes: delay, updatedAt: serverTimestamp() })
      toast.success(t('desk.delaySaved'))
    } catch { toast.error(t('term.errGeneric')) }
  }

  const toggleGuest = async () => {
    const next = !guestAccess
    setGuestAccess(next)
    try {
      await setDoc(doc(db, 'settings', 'guestAccess'), { enabled: next, updatedAt: serverTimestamp() })
      toast.success(t('desk.prefsSaved'))
    } catch { setGuestAccess(!next); toast.error(t('term.errGeneric')) }
  }

  const toggleInstant = async () => {
    const next = !instantApprove
    setInstantApprove(next)
    try {
      await setDoc(doc(db, 'settings', 'instantApprove'), { enabled: next, updatedAt: serverTimestamp() })
      toast.success(t('desk.prefsSaved'))
    } catch { setInstantApprove(!next); toast.error(t('term.errGeneric')) }
  }

  const pendingUsers = users.filter((u) => u.status === 'pending')

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#1a1a2e', fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 h-14 shrink-0" style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <span className="text-[18px]">⚙️</span>
          <span className="text-white text-[16px] font-medium">Admin Panel</span>
          <span className="text-white/30 text-[12px] ml-2">· {user?.username}</span>
        </div>
        <div className="flex items-center gap-3">
          {(['en', 'ru'] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)} className="px-2 py-1 text-[11px] text-white rounded" style={{ background: lang === l ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)' }}>{l.toUpperCase()}</button>
          ))}
          <button onClick={onSwitchToPortfolio} className="px-3 py-1.5 text-[12px] text-white rounded hover:bg-white/10 transition-colors">
            {lang === 'ru' ? '← В портфолио' : '← Portfolio'}
          </button>
          <button onClick={() => void logout()} className="px-3 py-1.5 text-[12px] text-white/70 hover:text-white transition-colors">
            {t('desk.shutdown')}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-52 shrink-0 p-3 flex flex-col gap-1" style={{ background: 'rgba(0,0,0,0.2)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          {([
            { id: 'users', label: t('desk.users'), icon: '👥' },
            { id: 'analytics', label: t('desk.analytics'), icon: '📊' },
            { id: 'console', label: t('desk.console'), icon: '🖥️' },
            { id: 'devices', label: t('desk.devices'), icon: '📱' },
          ] as const).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="flex items-center gap-2 px-3 py-2 text-[13px] rounded text-left transition-colors hover:bg-white/5"
              style={{ background: tab === item.id ? 'rgba(0,120,212,0.2)' : 'transparent', color: tab === item.id ? '#fff' : 'rgba(255,255,255,0.7)' }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.id === 'analytics' && pendingUsers.length > 0 && (
                <span className="ml-auto px-1.5 text-[9px] rounded-full" style={{ background: '#e81123', color: '#fff' }}>{pendingUsers.length}</span>
              )}
            </button>
          ))}
          <div className="mt-auto pt-3 border-t border-white/10">
            <button onClick={onSwitchToPortfolio} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-white/50 hover:text-white rounded transition-colors">
              <span>👁️</span>
              <span>{lang === 'ru' ? 'Просмотр портфолио' : 'View Portfolio'}</span>
            </button>
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* USERS TAB */}
          {tab === 'users' && (
            <div>
              <h2 className="text-white text-[18px] font-medium mb-4">{t('desk.userManagement')}</h2>
              {loading ? (
                <p className="text-white/40 text-[13px]">…</p>
              ) : (
                <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2 text-[11px] uppercase text-white/40 border-b border-white/10">
                    <span>{t('term.username')}</span>
                    <span>{t('desk.status')}</span>
                    <span>{t('desk.badge')}</span>
                    <span>{t('desk.joined')}</span>
                    <span>{t('desk.block')}</span>
                  </div>
                  {users.map((u) => {
                    const isMe = u.uid === user?.id
                    const joined = u.createdAt ? new Date(tsToMs(u.createdAt)).toLocaleDateString() : '—'
                    return (
                      <div key={u.uid} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 items-center border-b border-white/5 hover:bg-white/5 transition-colors" style={{ opacity: u.blocked ? 0.4 : 1 }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-white text-[13px] font-medium truncate">{u.username}</span>
                          {u.isAdmin && <span className="px-1.5 text-[9px] uppercase rounded" style={{ background: ACCENT, color: '#fff' }}>admin</span>}
                          {u.isGuest && <span className="px-1.5 text-[9px] uppercase rounded bg-white/10 text-white/60">guest</span>}
                          {u.blocked && <span className="px-1.5 text-[9px] uppercase rounded bg-red-500 text-white">{t('desk.blocked')}</span>}
                        </div>
                        <span className="text-white/60 text-[12px]">{u.status}</span>
                        <div className="min-w-0">
                          {editingBadge === u.uid ? (
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={badgeValue}
                                onChange={(e) => setBadgeValue(e.target.value)}
                                placeholder={t('desk.badgePlaceholder')}
                                maxLength={20}
                                className="w-20 px-1.5 py-0.5 text-[11px] bg-white/10 border border-white/20 rounded text-white outline-none"
                                onKeyDown={(e) => { if (e.key === 'Enter') void saveBadge(u); if (e.key === 'Escape') { setEditingBadge(null); setBadgeValue('') } }}
                                autoFocus
                              />
                              <button onClick={() => void saveBadge(u)} className="px-1.5 text-[10px] text-white bg-[#0078d4] rounded">✓</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingBadge(u.uid); setBadgeValue(u.badge || '') }}
                              className="text-[11px] text-white/60 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10"
                              disabled={isMe}
                            >
                              {u.badge || `+ ${t('desk.badge')}`}
                            </button>
                          )}
                        </div>
                        <span className="text-white/40 text-[11px]">{joined}</span>
                        <button
                          onClick={() => void toggleBlock(u)}
                          disabled={isMe || u.isAdmin}
                          className="px-3 py-1 text-[11px] rounded transition-colors disabled:opacity-20"
                          style={{
                            background: u.blocked ? 'rgba(255,255,255,0.1)' : 'rgba(232,17,35,0.2)',
                            color: u.blocked ? 'rgba(255,255,255,0.7)' : '#e81123',
                          }}
                        >
                          {u.blocked ? t('desk.unblock') : t('desk.block')}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ANALYTICS TAB */}
          {tab === 'analytics' && (
            <div>
              <h2 className="text-white text-[18px] font-medium mb-4">{t('desk.analytics')}</h2>
              {/* KPI cards */}
              <div className="grid grid-cols-3 gap-4 max-w-2xl mb-6">
                <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="text-[11px] uppercase text-white/40">{t('desk.totalViews')}</div>
                  <div className="text-[28px] font-bold text-white mt-1">{totalViews ?? '—'}</div>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="text-[11px] uppercase text-white/40">{t('desk.uniqueViewers')}</div>
                  <div className="text-[28px] font-bold text-white mt-1">{viewers.length}</div>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="text-[11px] uppercase text-white/40">{t('desk.pending')}</div>
                  <div className="text-[28px] font-bold text-white mt-1">{pendingUsers.length}</div>
                </div>
              </div>

              {/* Pending approvals */}
              <h3 className="text-white/70 text-[13px] font-medium mb-2">{t('desk.approvals')}</h3>
              {pendingUsers.length === 0 ? (
                <p className="text-white/40 text-[12px] mb-6">{t('desk.noPending')}</p>
              ) : (
                <div className="mb-6 space-y-2">
                  {pendingUsers.map((u) => (
                    <div key={u.uid} className="flex items-center justify-between px-3 py-2 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <span className="text-white text-[13px]">{u.username}</span>
                      <button onClick={() => void approveUser(u)} className="px-3 py-1 text-[11px] text-white rounded" style={{ background: ACCENT }}>
                        {t('desk.approve')}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent viewers */}
              <h3 className="text-white/70 text-[13px] font-medium mb-2">{t('desk.recentViewers')}</h3>
              {viewers.length === 0 ? (
                <p className="text-white/40 text-[12px]">{t('desk.noViewers')}</p>
              ) : (
                <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {viewers.slice(0, 15).map((v) => (
                    <div key={v.uid} className="flex items-center justify-between px-4 py-2 border-b border-white/5 text-[12px]">
                      <span className="text-white">{v.username || '—'}</span>
                      <span className="text-white/50">{v.views ?? 0} {t('desk.views')}</span>
                      <span className="text-white/30 text-[10px]">{v.lastSeen ? new Date(tsToMs(v.lastSeen)).toLocaleString() : '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONSOLE TAB */}
          {tab === 'console' && (
            <div>
              <h2 className="text-white text-[18px] font-medium mb-4">{t('desk.console')}</h2>

              {/* Create verified user */}
              <div className="mb-8">
                <h3 className="text-white/70 text-[13px] font-medium mb-3">{t('desk.createVerifiedUser')}</h3>
                <p className="text-white/40 text-[11px] mb-3">{t('desk.createVerifiedHint')}</p>
                <form onSubmit={handleCreateUser} className="flex flex-col gap-2 max-w-md">
                  <input
                    type="text"
                    value={cuUsername}
                    onChange={(e) => setCuUsername(e.target.value)}
                    placeholder={t('desk.newUsername')}
                    className="px-3 py-2 text-[13px] bg-white/5 border border-white/10 rounded text-white placeholder-white/30 outline-none focus:border-[#0078d4]"
                  />
                  <input
                    type="password"
                    value={cuPassword}
                    onChange={(e) => setCuPassword(e.target.value)}
                    placeholder={t('desk.newPassword')}
                    className="px-3 py-2 text-[13px] bg-white/5 border border-white/10 rounded text-white placeholder-white/30 outline-none focus:border-[#0078d4]"
                  />
                  <input
                    type="password"
                    value={cuConfirm}
                    onChange={(e) => setCuConfirm(e.target.value)}
                    placeholder={t('desk.confirmNewPassword')}
                    className="px-3 py-2 text-[13px] bg-white/5 border border-white/10 rounded text-white placeholder-white/30 outline-none focus:border-[#0078d4]"
                  />
                  <button type="submit" disabled={cuSubmitting || !cuUsername || !cuPassword} className="px-4 py-2 text-[13px] text-white rounded disabled:opacity-40" style={{ background: ACCENT }}>
                    {t('desk.createUser')}
                  </button>
                </form>
              </div>

              {/* Auto-approval */}
              <div className="mb-6">
                <h3 className="text-white/70 text-[13px] font-medium mb-3">{t('desk.autoApproval')}</h3>
                <p className="text-white/40 text-[11px] mb-3">{t('desk.autoApprovalHint')}</p>
                <div className="flex items-center gap-3 max-w-md">
                  <input
                    type="number"
                    min={0}
                    value={delay}
                    onChange={(e) => setDelay(Number(e.target.value))}
                    className="w-24 px-3 py-2 text-[13px] bg-white/5 border border-white/10 rounded text-white outline-none focus:border-[#0078d4]"
                  />
                  <span className="text-white/50 text-[12px]">{t('desk.delayMinutes')}</span>
                  <button onClick={() => void saveDelay()} className="px-3 py-2 text-[12px] text-white rounded" style={{ background: ACCENT }}>
                    {t('desk.saveDelay')}
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 max-w-md">
                <div className="flex items-center justify-between p-3 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div>
                    <div className="text-white text-[13px] font-medium">{t('desk.guestAccess')}</div>
                    <div className="text-white/40 text-[11px]">{t('desk.guestAccessHint')}</div>
                  </div>
                  <button onClick={() => void toggleGuest()} className="relative w-11 h-6 rounded-full transition-colors" style={{ background: guestAccess ? ACCENT : 'rgba(255,255,255,0.15)' }}>
                    <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform" style={{ left: guestAccess ? '22px' : '2px' }} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div>
                    <div className="text-white text-[13px] font-medium">{t('desk.instantApprove')}</div>
                    <div className="text-white/40 text-[11px]">{t('desk.instantApproveHint')}</div>
                  </div>
                  <button onClick={() => void toggleInstant()} className="relative w-11 h-6 rounded-full transition-colors" style={{ background: instantApprove ? ACCENT : 'rgba(255,255,255,0.15)' }}>
                    <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform" style={{ left: instantApprove ? '22px' : '2px' }} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DEVICES TAB */}
          {tab === 'devices' && (
            <div>
              <h2 className="text-white text-[18px] font-medium mb-4">{t('desk.devices')}</h2>
              {logins.length === 0 ? (
                <p className="text-white/40 text-[12px]">{t('desk.noLogins')}</p>
              ) : (
                <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="grid grid-cols-[1.5fr_2fr_1.5fr_auto] gap-3 px-4 py-2 text-[11px] uppercase text-white/40 border-b border-white/10">
                    <span>{t('term.username')}</span>
                    <span>{t('desk.device')}</span>
                    <span>{t('desk.location')}</span>
                    <span>{t('desk.loginTime')}</span>
                  </div>
                  {logins.map((l, i) => (
                    <div key={i} className="grid grid-cols-[1.5fr_2fr_1.5fr_auto] gap-3 px-4 py-2 border-b border-white/5 text-[12px]">
                      <span className="text-white truncate">{l.username || '—'}</span>
                      <span className="text-white/60 truncate">{l.userAgent || '—'}</span>
                      <span className="text-white/50 truncate">{l.city}, {l.country}</span>
                      <span className="text-white/30 text-[10px]">{l.timestamp ? new Date(tsToMs(l.timestamp)).toLocaleString() : '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
