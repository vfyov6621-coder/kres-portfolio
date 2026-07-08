'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { WINDOWS, BEVEL_OUT, BEVEL_IN_THIN, FACE, FACE_DARK, FACE_LIGHT } from './types'
import type { WindowState } from './types'

interface DesktopWindowProps {
  state: WindowState
  focused: boolean
  isNarrow: boolean
  desktopRef: React.RefObject<HTMLDivElement | null>
  onFocus: () => void
  onClose: () => void
  onMinimize: () => void
  onMaximize: () => void
  onMove: (x: number, y: number) => void
  children: ReactNode
  t: (k: string) => string
}

type DragState = { mouseX: number; mouseY: number; winX: number; winY: number } | null

export function DesktopWindow({
  state,
  focused,
  isNarrow,
  desktopRef,
  onFocus,
  onClose,
  onMinimize,
  onMaximize,
  onMove,
  children,
  t,
}: DesktopWindowProps) {
  const meta = WINDOWS.find((m) => m.id === state.id)
  const dragRef = useRef<DragState>(null)

  // Pointer-event dragging via setPointerCapture on the title bar.
  const onTitlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    onFocus()
    if (isNarrow || state.maximized) return
    const el = e.currentTarget
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    dragRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      winX: state.x,
      winY: state.y,
    }
  }

  const onTitlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const start = dragRef.current
    const dx = e.clientX - start.mouseX
    const dy = e.clientY - start.mouseY
    let nx = start.winX + dx
    let ny = start.winY + dy
    const desk = desktopRef.current
    if (desk) {
      const rect = desk.getBoundingClientRect()
      // Keep at least 80px of the window visible horizontally and 32px vertically.
      const minX = -state.w + 80
      const maxX = rect.width - 40
      const minY = 0
      const maxY = Math.max(0, rect.height - 32)
      nx = Math.max(minX, Math.min(nx, maxX))
      ny = Math.max(minY, Math.min(ny, maxY))
    }
    onMove(nx, ny)
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
    }
    dragRef.current = null
  }

  // Release capture on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragRef.current) {
        dragRef.current = null
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!meta) return null

  // Geometry: narrow or maximized windows fill the desktop area.
  // On mobile (narrow), leave room at top for the horizontal icon strip.
  const fills = isNarrow || state.maximized
  const style: CSSProperties = fills
    ? {
        left: isNarrow ? 6 : 0,
        top: isNarrow ? 72 : 0,
        right: isNarrow ? 6 : 0,
        bottom: isNarrow ? 6 : 0,
        width: 'auto',
        height: 'auto',
        zIndex: state.z,
      }
    : {
        left: state.x,
        top: state.y,
        width: state.w,
        height: state.h,
        zIndex: state.z,
      }

  const titleBarBg = focused ? FACE_DARK : FACE_LIGHT
  const titleTextColor = focused ? '#000' : '#5a5a5a'

  return (
    <section
      role="dialog"
      aria-label={t(meta.labelKey)}
      onPointerDown={onFocus}
      className="absolute flex flex-col"
      style={{
        ...style,
        background: FACE,
        ...BEVEL_OUT,
      }}
    >
      {/* Title bar with MacOS traffic lights (left) + Win98 title text */}
      <div
        className="group relative flex items-center h-11 md:h-6 pl-1 pr-1.5 select-none"
        style={{
          background: titleBarBg,
          boxShadow: 'inset 0 -1px 0 0 #808080',
          cursor: isNarrow || state.maximized ? 'default' : 'move',
        }}
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => !isNarrow && onMaximize()}
      >
        {/* Traffic lights */}
        <div className="flex items-center gap-1 md:gap-1.5 mr-2" aria-label="window controls">
          <TrafficLight
            symbol="×"
            title={t('desk.windowClose')}
            onClick={onClose}
          />
          <TrafficLight
            symbol="–"
            title={t('desk.windowMinimize')}
            onClick={onMinimize}
          />
          <TrafficLight
            symbol="+"
            title={t('desk.windowMaximize')}
            onClick={onMaximize}
            disabled={isNarrow}
          />
        </div>

        <meta.Icon
          className="w-4 h-4 md:w-3.5 md:h-3.5 mr-1.5 shrink-0"
          style={{ color: titleTextColor }}
          aria-hidden
        />
        <span
          className="text-[13px] md:text-[13px] font-bold truncate"
          style={{ color: titleTextColor }}
        >
          {t(meta.labelKey)}
        </span>

        {/* Subtle focus indicator on the right */}
        <span
          className="ml-auto hidden md:inline-block w-2 h-2"
          style={{
            background: focused ? '#000' : 'transparent',
            border: focused ? '1px solid #fff' : '1px solid #808080',
          }}
          aria-hidden
        />
      </div>

      {/* Content area: white, inset bevel, scrollable */}
      <div
        className="flex-1 min-h-0 overflow-y-auto bg-white text-black win-scroll"
        style={{ ...BEVEL_IN_THIN, margin: 2 }}
      >
        {children}
      </div>

      {/* Bottom status strip (Win98-style) */}
      <div
        className="hidden md:flex items-center justify-between px-2 h-4 text-[10px] text-black"
        style={{ background: FACE }}
      >
        <span className="truncate opacity-70">{t(meta.labelKey)}</span>
        <span className="opacity-70">
          {state.maximized ? t('desk.windowMaximize') : ''}
        </span>
      </div>
    </section>
  )
}

interface TrafficLightProps {
  symbol: string
  title: string
  onClick: () => void
  disabled?: boolean
}

function TrafficLight({ symbol, title, onClick, disabled }: TrafficLightProps) {
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onClick()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      className="flex items-center justify-center min-w-[36px] min-h-[36px] md:min-w-[14px] md:min-h-[14px] p-1 md:p-0"
    >
      <span
        className="w-4 h-4 md:w-3 md:h-3 rounded-full border border-black flex items-center justify-center"
        style={{ background: FACE_LIGHT }}
      >
        <span
          className="text-[10px] md:text-[9px] font-bold leading-none opacity-0 group-hover:opacity-100"
          style={{ color: '#000' }}
        >
          {symbol}
        </span>
      </span>
    </button>
  )
}
