'use client'

import { useEffect, useState } from 'react'
import { useAuth, type UserStatus, getAutoApprovalDelay } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'

/**
 * Shown when a signed-in user's registration is pending admin approval
 * or has been rejected. Offers a log out action.
 *
 * For pending users: if auto-approval is configured (delay > 0) and the delay
 * has not yet elapsed, shows a live countdown. When the countdown reaches 0,
 * reloads the page so onAuthStateChanged re-runs and auto-approves the user.
 */
export default function PendingScreen({ status, createdAt }: { status: UserStatus; createdAt?: string }) {
  const { logout, refresh } = useAuth()
  const { t } = useLanguage()
  const isRejected = status === 'rejected'
  const title = isRejected ? t('rejected.title') : t('pending.title')
  const body = isRejected ? t('rejected.body') : t('pending.body')
  const logoutLabel = isRejected ? t('rejected.logout') : t('pending.logout')

  // Auto-approval countdown for pending users.
  const [remainingMs, setRemainingMs] = useState<number | null>(null)

  useEffect(() => {
    if (isRejected) return
    let raf = 0
    let delayMin = 0
    let created = 0
    void (async () => {
      delayMin = await getAutoApprovalDelay()
      if (delayMin <= 0) return
      created = createdAt ? new Date(createdAt).getTime() : 0
      if (!created) return
      const tick = () => {
        const target = created + delayMin * 60_000
        const rem = target - Date.now()
        setRemainingMs(rem > 0 ? rem : 0)
        if (rem > 0) {
          raf = window.setTimeout(tick, 1000)
        } else {
          // Delay elapsed — try to self-approve via refresh, which re-runs
          // onAuthStateChanged → tryAutoApprove.
          void refresh()
        }
      }
      tick()
    })()
    return () => {
      if (raf) window.clearTimeout(raf)
    }
  }, [isRejected, createdAt, refresh])

  const showCountdown = remainingMs !== null && remainingMs > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black px-6">
      <div className="max-w-md w-full text-center font-mono">
        {/* Status indicator */}
        <div className="mx-auto mb-6 flex items-center justify-center gap-2">
          {isRejected ? (
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          ) : (
            <span className="inline-block w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
          )}
          <span className="text-white/70 text-xs tracking-[0.2em] uppercase">
            {isRejected ? t('desk.rejected') : t('desk.pending')}
          </span>
        </div>

        <h1 className="text-white text-xl sm:text-2xl font-bold tracking-tight mb-4">
          {title}
        </h1>
        <p className="text-white/60 text-sm leading-relaxed mb-8">{body}</p>

        {/* Auto-approval countdown */}
        {showCountdown ? (
          <div className="mb-8 p-4 border border-white/20">
            <p className="text-white/50 text-[11px] tracking-[0.2em] uppercase mb-2">
              {t('desk.autoApprovalIn')}
            </p>
            <p className="text-white text-3xl font-bold tabular-nums tracking-tight">
              {fmtDuration(remainingMs as number)}
            </p>
            <p className="text-white/40 text-[11px] mt-2">{t('desk.autoApprovalSoon')}</p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void logout()}
          className="px-6 py-2.5 min-h-[44px] text-sm text-black bg-white hover:bg-white/90 transition-colors font-bold tracking-wide"
        >
          {logoutLabel}
        </button>
      </div>
    </div>
  )
}

/** Format milliseconds as MM:SS (or HH:MM:SS for > 1 hour). */
function fmtDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}
