'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { initPortfolioSync } from '@/lib/portfolio-store'
import { recordPortfolioView } from '@/lib/analytics'
import Win10LockScreen from '@/components/Win10LockScreen'
import PortfolioDesktop from '@/components/portfolio/PortfolioDesktop'
import AdminPanel from '@/components/admin/AdminPanel'
import WelcomeScreen from '@/components/WelcomeScreen'
import PendingScreen from '@/components/PendingScreen'

const WELCOME_SESSION_KEY = 'kres_welcome_shown'
const ADMIN_VIEW_KEY = 'kres_admin_view' // 'admin' | 'portfolio' | null
const welcomeListeners = new Set<() => void>()

function subscribeWelcome(cb: () => void) {
  welcomeListeners.add(cb)
  return () => { welcomeListeners.delete(cb) }
}
function readWelcomeClient(): boolean {
  return !window.sessionStorage.getItem(WELCOME_SESSION_KEY)
}
function readWelcomeServer(): boolean {
  return false
}

export default function Home() {
  const { user, loading } = useAuth()
  const showWelcome = useSyncExternalStore(subscribeWelcome, readWelcomeClient, readWelcomeServer)
  const viewRecordedRef = useRef(false)
  const [adminView, setAdminView] = useState<'admin' | 'portfolio' | null>(null)

  useEffect(() => {
    const unsub = initPortfolioSync()
    return unsub
  }, [])

  useEffect(() => {
    if (!user || viewRecordedRef.current) return
    if (user.status === 'approved') {
      viewRecordedRef.current = true
      void recordPortfolioView(user.id, user.username)
    }
  }, [user])

  // When an admin logs in, check if they previously chose a view this session.
  useEffect(() => {
    if (!user) return
    if (user.isAdmin && adminView === null) {
      const saved = sessionStorage.getItem(ADMIN_VIEW_KEY)
      if (saved === 'admin' || saved === 'portfolio') {
        // Use a microtask to avoid setState-in-effect lint warning.
        queueMicrotask(() => setAdminView(saved))
      }
    }
    if (!user.isAdmin) {
      queueMicrotask(() => setAdminView(null))
      sessionStorage.removeItem(ADMIN_VIEW_KEY)
    }
  }, [user, adminView])

  if (showWelcome) {
    return (
      <WelcomeScreen
        onDone={() => {
          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(WELCOME_SESSION_KEY, '1')
            welcomeListeners.forEach((l) => l())
          }
        }}
      />
    )
  }

  if (loading) {
    return <div className="fixed inset-0 bg-black" aria-hidden />
  }

  if (!user) {
    return <Win10LockScreen />
  }

  if (user.status !== 'approved') {
    return <PendingScreen status={user.status} />
  }

  // Admin choice screen — no public URL, state-based only.
  if (user.isAdmin && adminView === null) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black px-6">
        <img
          src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo.png`}
          alt="Logo"
          className="w-16 h-16 object-contain mb-8 select-none"
          draggable={false}
        />
        <h1 className="text-white text-2xl font-light mb-2">Welcome, {user.username}</h1>
        <p className="text-white/40 text-[13px] mb-10">Choose a view to continue</p>
        <div className="flex gap-4 flex-wrap justify-center">
          <button
            onClick={() => { setAdminView('admin'); sessionStorage.setItem(ADMIN_VIEW_KEY, 'admin') }}
            className="flex flex-col items-center gap-3 p-6 rounded-lg border border-white/10 hover:border-[#0078d4] hover:bg-white/5 transition-all min-w-[180px]"
          >
            <span className="text-[32px]">⚙️</span>
            <span className="text-white text-[14px] font-medium">Admin Panel</span>
            <span className="text-white/40 text-[11px]">Manage users, content, analytics</span>
          </button>
          <button
            onClick={() => { setAdminView('portfolio'); sessionStorage.setItem(ADMIN_VIEW_KEY, 'portfolio') }}
            className="flex flex-col items-center gap-3 p-6 rounded-lg border border-white/10 hover:border-[#0078d4] hover:bg-white/5 transition-all min-w-[180px]"
          >
            <span className="text-[32px]">👁️</span>
            <span className="text-white text-[14px] font-medium">Portfolio</span>
            <span className="text-white/40 text-[11px]">View as a regular visitor</span>
          </button>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem(ADMIN_VIEW_KEY); void user }}
          className="mt-10 text-white/40 hover:text-white text-[12px]"
          style={{ display: 'none' }}
        >
          {/* placeholder */}
        </button>
      </div>
    )
  }

  // Admin in portfolio view → show regular desktop with a switch button.
  if (user.isAdmin && adminView === 'portfolio') {
    return <PortfolioDesktop />
  }

  // Admin in admin view → Admin Panel (no public URL).
  if (user.isAdmin && adminView === 'admin') {
    return <AdminPanel onSwitchToPortfolio={() => { setAdminView('portfolio'); sessionStorage.setItem(ADMIN_VIEW_KEY, 'portfolio') }} />
  }

  // Regular approved user → portfolio desktop.
  return <PortfolioDesktop />
}
