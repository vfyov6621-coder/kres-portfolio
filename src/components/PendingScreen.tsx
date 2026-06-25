'use client'

import { useAuth, type UserStatus } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'

/**
 * Shown when a signed-in user's registration is pending admin approval
 * or has been rejected. Offers a log out action.
 */
export default function PendingScreen({ status }: { status: UserStatus }) {
  const { logout } = useAuth()
  const { t } = useLanguage()
  const isRejected = status === 'rejected'
  const title = isRejected ? t('rejected.title') : t('pending.title')
  const body = isRejected ? t('rejected.body') : t('pending.body')
  const logoutLabel = isRejected ? t('rejected.logout') : t('pending.logout')

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
