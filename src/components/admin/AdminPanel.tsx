'use client'

import { useState, useEffect } from 'react'
import { useAuth, type AuthUser } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { BEVEL_IN_THIN, ACCENT } from '@/components/portfolio/types'
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
  createdAt?: { toMillis?: () => number } | string | null
}

export default function AdminPanel({ onSwitchToPortfolio }: AdminPanelProps) {
  const { user, logout } = useAuth()
  const { t, lang, setLang } = useLanguage()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'users' | 'analytics' | 'content'>('users')
  const [editingBadge, setEditingBadge] = useState<string | null>(null)
  const [badgeValue, setBadgeValue] = useState('')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const snap = await getDocs(collection(db, 'users'))
        if (cancelled) return
        const rows: UserRow[] = []
        snap.forEach((d) => rows.push({ ...(d.data() as UserRow), uid: d.id }))
        rows.sort((a, b) => {
          if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1
          return a.username.localeCompare(b.username)
        })
        setUsers(rows)
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
        <nav className="w-48 shrink-0 p-3 flex flex-col gap-1" style={{ background: 'rgba(0,0,0,0.2)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          {([
            { id: 'users', label: t('desk.users'), icon: '👥' },
            { id: 'analytics', label: t('desk.analytics'), icon: '📊' },
            { id: 'content', label: t('desk.editContent'), icon: '📝' },
          ] as const).map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="flex items-center gap-2 px-3 py-2 text-[13px] text-white/70 rounded text-left transition-colors hover:bg-white/5"
              style={{ background: tab === item.id ? 'rgba(0,120,212,0.2)' : 'transparent', color: tab === item.id ? '#fff' : 'rgba(255,255,255,0.7)' }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {tab === 'users' && (
            <div>
              <h2 className="text-white text-[18px] font-medium mb-4">{t('desk.userManagement')}</h2>
              {loading ? (
                <p className="text-white/40 text-[13px]">…</p>
              ) : (
                <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {/* Table header */}
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2 text-[11px] uppercase text-white/40 border-b border-white/10">
                    <span>{t('term.username')}</span>
                    <span>{t('desk.status')}</span>
                    <span>{t('desk.badge')}</span>
                    <span>{t('desk.joined')}</span>
                    <span>{t('desk.block')}</span>
                  </div>
                  {/* Rows */}
                  {users.map((u) => {
                    const isMe = u.uid === user?.id
                    const joined = u.createdAt && typeof u.createdAt === 'object' && u.createdAt.toMillis
                      ? new Date(u.createdAt.toMillis()).toLocaleDateString()
                      : '—'
                    return (
                      <div key={u.uid} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 items-center border-b border-white/5 hover:bg-white/5 transition-colors" style={{ opacity: u.blocked ? 0.4 : 1 }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-white text-[13px] font-medium truncate">{u.username}</span>
                          {u.isAdmin && <span className="px-1.5 text-[9px] uppercase rounded" style={{ background: ACCENT, color: '#fff' }}>admin</span>}
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

          {tab === 'analytics' && (
            <div>
              <h2 className="text-white text-[18px] font-medium mb-4">{t('desk.analytics')}</h2>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="text-[11px] uppercase text-white/40">{t('desk.totalViews')}</div>
                  <div className="text-[28px] font-bold text-white mt-1">—</div>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="text-[11px] uppercase text-white/40">{t('desk.uniqueViewers')}</div>
                  <div className="text-[28px] font-bold text-white mt-1">{users.filter(u => !u.isAdmin).length}</div>
                </div>
              </div>
              <p className="text-white/40 text-[12px] mt-4">{lang === 'ru' ? 'Откройте окно Analytics на десктопе для подробной статистики.' : 'Open the Analytics window on the desktop for detailed stats.'}</p>
            </div>
          )}

          {tab === 'content' && (
            <div>
              <h2 className="text-white text-[18px] font-medium mb-4">{t('desk.editContent')}</h2>
              <p className="text-white/40 text-[12px]">{lang === 'ru' ? 'Откройте окно Settings на десктопе для редактирования контента.' : 'Open the Settings window on the desktop to edit content.'}</p>
              <button onClick={onSwitchToPortfolio} className="mt-4 px-4 py-2 text-[13px] text-white rounded" style={{ background: ACCENT }}>
                {lang === 'ru' ? 'Перейти в портфолио' : 'Go to Portfolio'}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
