'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { Toaster as SonnerToaster } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { Taskbar } from './Taskbar'
import { StartMenu } from './StartMenu'
import { DesktopIcons } from './DesktopIcons'
import { DesktopWindow } from './DesktopWindow'
import { WindowContents } from './WindowContents'
import { useIsNarrow } from './useIsNarrow'
import {
  DEFAULT_WINDOW_H,
  DEFAULT_WINDOW_W,
  WINDOW_CASCADE,
  type WindowId,
  type WindowState,
} from './types'
import './desktop.css'

export default function PortfolioDesktop() {
  const { user, logout, changePassword } = useAuth()
  const { lang, setLang, t } = useLanguage()
  const isNarrow = useIsNarrow()

  const [windows, setWindows] = useState<WindowState[]>([])
  const [startOpen, setStartOpen] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState<WindowId | null>(null)

  const desktopRef = useRef<HTMLDivElement>(null)
  const zCounter = useRef(10)

  const bumpZ = useCallback(() => {
    zCounter.current += 1
    return zCounter.current
  }, [])

  const openWindow = useCallback(
    (id: WindowId) => {
      setWindows((prev) => {
        const existing = prev.find((w) => w.id === id)
        if (existing) {
          return prev.map((w) =>
            w.id === id ? { ...w, minimized: false, z: bumpZ() } : w,
          )
        }
        const idx = prev.length
        return [
          ...prev,
          {
            id,
            minimized: false,
            maximized: false,
            z: bumpZ(),
            x: 120 + idx * WINDOW_CASCADE,
            y: 24 + idx * WINDOW_CASCADE,
            w: DEFAULT_WINDOW_W,
            h: DEFAULT_WINDOW_H,
          },
        ]
      })
      setSelectedIcon(id)
      setStartOpen(false)
    },
    [bumpZ],
  )

  const closeWindow = useCallback((id: WindowId) => {
    setWindows((prev) => prev.filter((w) => w.id !== id))
  }, [])

  const focusWindow = useCallback(
    (id: WindowId) => {
      setWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, z: bumpZ() } : w)),
      )
    },
    [bumpZ],
  )

  const toggleMinimize = useCallback((id: WindowId) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: !w.minimized } : w)),
    )
  }, [])

  const toggleMaximize = useCallback((id: WindowId) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)),
    )
  }, [])

  const moveWindow = useCallback((id: WindowId, x: number, y: number) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, x, y } : w)),
    )
  }, [])

  const resizeWindow = useCallback((id: WindowId, w: number, h: number, x?: number, y?: number) => {
    setWindows((prev) =>
      prev.map((win) => {
        if (win.id !== id) return win
        const next: WindowState = { ...win, w, h }
        if (typeof x === 'number') next.x = x
        if (typeof y === 'number') next.y = y
        return next
      }),
    )
  }, [])

  // Active = visible window with the highest z.
  const activeId = useMemo<WindowId | null>(() => {
    const visible = windows.filter((w) => !w.minimized)
    if (visible.length === 0) return null
    return visible.reduce((top, w) => (w.z > top.z ? w : top), visible[0]).id
  }, [windows])

  // Taskbar click behavior:
  // - if minimized → restore + focus
  // - else if it's the active one → minimize
  // - else → focus
  const onTaskClick = useCallback(
    (id: WindowId) => {
      const w = windows.find((x) => x.id === id)
      if (!w) return
      if (w.minimized) {
        toggleMinimize(id)
        focusWindow(id)
      } else if (activeId === id) {
        toggleMinimize(id)
      } else {
        focusWindow(id)
      }
    },
    [windows, activeId, toggleMinimize, focusWindow],
  )

  // Clicking empty desktop deselects icons and closes the start menu.
  const onDesktopPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        setSelectedIcon(null)
        setStartOpen(false)
      }
    },
    [],
  )

  if (!user) return null

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden bg-black text-black"
      style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
    >
      {/* Desktop area */}
      <div
        ref={desktopRef}
        onPointerDown={onDesktopPointerDown}
        className="relative flex-1 overflow-hidden"
        style={{
          backgroundColor: '#0e0e0e',
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      >
        <DesktopIcons
          t={t}
          selected={selectedIcon}
          onSelect={setSelectedIcon}
          onOpen={openWindow}
          isAdmin={user.isAdmin}
        />

        {windows
          .filter((w) => !w.minimized)
          .map((w) => (
            <DesktopWindow
              key={w.id}
              state={w}
              focused={activeId === w.id}
              isNarrow={isNarrow}
              desktopRef={desktopRef}
              onFocus={() => focusWindow(w.id)}
              onClose={() => closeWindow(w.id)}
              onMinimize={() => toggleMinimize(w.id)}
              onMaximize={() => toggleMaximize(w.id)}
              onMove={(x, y) => moveWindow(w.id, x, y)}
              onResize={(nw, nh, nx, ny) => resizeWindow(w.id, nw, nh, nx, ny)}
              t={t}
            >
              <WindowContents
                id={w.id}
                user={user}
                lang={lang}
                setLang={setLang}
                changePassword={changePassword}
                t={t}
              />
            </DesktopWindow>
          ))}

        {startOpen && (
          <StartMenu
            t={t}
            onClose={() => setStartOpen(false)}
            onOpen={openWindow}
            onLogout={() => void logout()}
            isAdmin={user.isAdmin}
          />
        )}
      </div>

      <Taskbar
        t={t}
        windows={windows}
        startOpen={startOpen}
        onStart={() => setStartOpen((o) => !o)}
        onTaskClick={onTaskClick}
        activeId={activeId}
      />

      {/* Local sonner toaster (B&W styled to match the desktop aesthetic). */}
      <SonnerToaster
        theme="light"
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#fff',
            color: '#000',
            border: '1px solid #000',
            borderRadius: 0,
            fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            fontSize: '13px',
            boxShadow: 'inset -1px -1px 0 0 #000, inset 1px 1px 0 0 #fff, 2px 2px 0 #000',
          },
        }}
      />
    </div>
  )
}
