'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { initPortfolioSync } from '@/lib/portfolio-store'
import { recordPortfolioView } from '@/lib/analytics'
import TerminalAuth from '@/components/terminal/TerminalAuth'
import PortfolioDesktop from '@/components/portfolio/PortfolioDesktop'
import WelcomeScreen from '@/components/WelcomeScreen'
import PendingScreen from '@/components/PendingScreen'

const WELCOME_SESSION_KEY = 'kres_welcome_shown'

/** Returns true if the welcome splash should show for this session. SSR-safe. */
function shouldShowWelcome(): boolean {
  if (typeof window === 'undefined') return false
  return !window.sessionStorage.getItem(WELCOME_SESSION_KEY)
}

export default function Home() {
  const { user, loading } = useAuth()
  // Lazy-init: read sessionStorage once on first client render. SSR returns
  // false (no splash on the server) so there's no hydration mismatch.
  const [showWelcome, setShowWelcome] = useState(shouldShowWelcome)
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
          }
          setShowWelcome(false)
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
