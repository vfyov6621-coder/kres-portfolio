'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { initPortfolioSync } from '@/lib/portfolio-store'
import { recordPortfolioView } from '@/lib/analytics'
import TerminalAuth from '@/components/terminal/TerminalAuth'
import PortfolioDesktop from '@/components/portfolio/PortfolioDesktop'
import WelcomeScreen from '@/components/WelcomeScreen'
import PendingScreen from '@/components/PendingScreen'

const WELCOME_SESSION_KEY = 'kres_welcome_shown'
const welcomeListeners = new Set<() => void>()

function subscribeWelcome(cb: () => void) {
  welcomeListeners.add(cb)
  return () => {
    welcomeListeners.delete(cb)
  }
}

/** Client snapshot: true when the welcome splash has NOT been shown yet. */
function readWelcomeClient(): boolean {
  return !window.sessionStorage.getItem(WELCOME_SESSION_KEY)
}

/** Server snapshot: always false (no splash during SSR/build). */
function readWelcomeServer(): boolean {
  return false
}

export default function Home() {
  const { user, loading } = useAuth()
  // useSyncExternalStore avoids hydration mismatch: server renders false,
  // client hydrates with false (matching), then immediately re-renders with
  // the real sessionStorage value.
  const showWelcome = useSyncExternalStore(
    subscribeWelcome,
    readWelcomeClient,
    readWelcomeServer,
  )
  const viewRecordedRef = useRef(false)

  // Subscribe to the Firestore portfolio content document once.
  useEffect(() => {
    const unsub = initPortfolioSync()
    return unsub
  }, [])

  // Record a portfolio view once per session when an approved user lands.
  useEffect(() => {
    if (!user || viewRecordedRef.current) return
    if (user.status === 'approved') {
      viewRecordedRef.current = true
      void recordPortfolioView(user.id, user.username)
    }
  }, [user])

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
    return <TerminalAuth />
  }

  // Pending or rejected users see the holding screen instead of the portfolio.
  if (user.status !== 'approved') {
    return <PendingScreen status={user.status} />
  }

  return <PortfolioDesktop />
}
