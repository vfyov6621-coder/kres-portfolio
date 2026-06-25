'use client'

import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '@/contexts/language-context'

const DURATION_MS = 10000 // ~10 seconds, as requested.

/**
 * Full-screen intro splash: shows the welcome image (KRESOS logo on black)
 * with a progress bar that fills over DURATION_MS, then calls onDone.
 * Shown once per browser session (tracked via sessionStorage).
 */
export default function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const { t } = useLanguage()
  const [pct, setPct] = useState(0)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const next = Math.min(100, (elapsed / DURATION_MS) * 100)
      setPct(next)
      if (next < 100) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Small delay so the user sees 100% before transitioning.
        setTimeout(onDone, 250)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [onDone])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black">
      {/* Logo image, centered */}
      <div className="flex flex-1 items-center justify-center px-8">
        <img
          src="/welcome.png"
          alt="KRESOS"
          className="max-h-[55vh] max-w-[80vw] w-auto h-auto object-contain select-none"
          draggable={false}
        />
      </div>

      {/* Tagline + progress bar */}
      <div className="w-full max-w-md px-6 pb-[12vh] flex flex-col items-center gap-3">
        <p className="text-white/60 text-xs sm:text-sm tracking-[0.25em] uppercase font-mono">
          {t('welcome.tagline')}
        </p>
        <div className="w-full h-[6px] bg-white/10 overflow-hidden">
          <div
            className="h-full bg-white transition-[width] duration-100 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="w-full flex justify-between items-center text-white/40 text-[10px] font-mono">
          <span>{t('welcome.loading')}</span>
          <span className="tabular-nums">{Math.round(pct)}%</span>
        </div>
      </div>
    </div>
  )
}
