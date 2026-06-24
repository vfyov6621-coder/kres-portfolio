'use client'

import { useAuth } from '@/contexts/auth-context'
import TerminalAuth from '@/components/terminal/TerminalAuth'
import PortfolioDesktop from '@/components/portfolio/PortfolioDesktop'

export default function Home() {
  const { user, loading } = useAuth()

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
