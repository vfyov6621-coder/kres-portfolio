'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { initPortfolioSync } from '@/lib/portfolio-store'
import TerminalAuth from '@/components/terminal/TerminalAuth'
import PortfolioDesktop from '@/components/portfolio/PortfolioDesktop'

export default function Home() {
  const { user, loading } = useAuth()

  // Subscribe to the Firestore portfolio content document once.
  useEffect(() => {
    const unsub = initPortfolioSync()
    return unsub
  }, [])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black" aria-hidden />
    )
  }

  if (!user) {
    return <TerminalAuth />
  }

  return <PortfolioDesktop />
}
