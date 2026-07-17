'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { WINDOWS, BEVEL_OUT, BEVEL_IN_THIN, FACE, FACE_DARK, FACE_LIGHT, ACCENT } from './types'
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
  onResize: (w: number, h: number, x?: number, y?: number) => void
  children: ReactNode
  t: (k: string) => string
}

type DragState = { mouseX: number; mouseY: number; winX: number; winY: number } | null

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

type ResizeState = {
  dir: ResizeDir
  mouseX: number
  mouseY: number
  winX: number
  winY: number
  winW: number
  winH: number
} | null

const MIN_W = 300
const MIN_H = 220

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
  onResize,
  children,
  t,
}: DesktopWindowProps) {
  const meta = WINDOWS.find((m) => m.id === state.id)
  const dragRef = useRef<DragState>(null)
  const resizeRef = useRef<ResizeState>(null)

  const onTitlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    onFocus()
    if (isNarrow || state.maximized) return
    const el = e.currentTarget
    try { el.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    dragRef.current = { mouseX: e.clientX, mouseY: e.clientY, winX: state.x, winY: state.y }
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
      nx = Math.max(-state.w + 80, Math.min(nx, rect.width - 40))
      ny = Math.max(0, Math.min(ny, Math.max(0, rect.height - 32)))
    }
    onMove(nx, ny)
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    }
    dragRef.current = null
  }

  const onResizeStart = (dir: ResizeDir) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || isNarrow || state.maximized) return
    e.stopPropagation()
    onFocus()
    const el = e.currentTarget
    try { el.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    resizeRef.current = {
      dir, mouseX: e.clientX, mouseY: e.clientY,
      winX: state.x, winY: state.y, winW: state.w, winH: state.h,
    }
  }

  const onResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current) return
    const s = resizeRef.current
    const dx = e.clientX - s.mouseX
    const dy = e.clientY - s.mouseY
    let { winX, winY, winW, winH } = s
    const dir = s.dir
    if (dir.includes('e')) winW = Math.max(MIN_W, s.winW + dx)
    if (dir.includes('s')) winH = Math.max(MIN_H, s.winH + dy)
    if (dir.includes('w')) { const nw = Math.max(MIN_W, s.winW - dx); winX = s.winX + (s.winW - nw); winW = nw }
    if (dir.includes('n')) { const nh = Math.max(MIN_H, s.winH - dy); winY = s.winY + (s.winH - nh); winH = nh }
    const desk = desktopRef.current
    if (desk) {
      const rect = desk.getBoundingClientRect()
      if (winX < 0) { winW += winX; winX = 0 }
      if (winY < 0) { winH += winY; winY = 0 }
      if (winX + winW > rect.width) winW = rect.width - winX
      if (winY + winH > rect.height) winH = rect.height - winY
      winW = Math.max(MIN_W, winW)
      winH = Math.max(MIN_H, winH)
    }
    onResize(winW, winH, winX, winY)
  }

  const endResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizeRef.current) {
      try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
    }
    resizeRef.current = null
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { dragRef.current = null; resizeRef.current = null }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!meta) return null

  const fills = isNarrow || state.maximized
  const style: CSSProperties = fills
    ? { left: isNarrow ? 6 : 0, top: isNarrow ? 72 : 0, right: isNarrow ? 6 : 0, bottom: isNarrow ? 6 : 0, width: 'auto', height: 'auto', zIndex: state.z }
    : { left: state.x, top: state.y, width: state.w, height: state.h, zIndex: state.z }

  const canResize = !isNarrow && !state.maximized

  return (
    <section
      role="dialog"
      aria-label={t(meta.labelKey)}
      onPointerDown={onFocus}
      className="absolute flex flex-col rounded-[6px] overflow-hidden"
      style={{
        ...style,
        background: FACE_LIGHT,
        boxShadow: focused ? '0 8px 24px rgba(0,0,0,0.18)' : '0 2px 8px rgba(0,0,0,0.12)',
        border: `1px solid ${focused ? ACCENT : 'rgba(0,0,0,0.1)'}`,
      }}
    >
      {/* Title bar — Win10 flat style */}
      <div
        className="group relative flex items-center h-9 pl-3 pr-0 select-none"
        style={{
          background: focused ? FACE_DARK : FACE,
          cursor: isNarrow || state.maximized ? 'default' : 'move',
        }}
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => !isNarrow && onMaximize()}
      >
        <meta.Icon className="w-4 h-4 mr-2 shrink-0" style={{ color: '#444' }} aria-hidden />
        <span className="text-[13px] font-medium text-[#222] truncate flex-1">{t(meta.labelKey)}</span>

        {/* Win10-style square window controls */}
        <div className="flex items-stretch h-full">
          <Win10Button onClick={onMinimize} title={t('desk.windowMinimize')} symbol="—" />
          <Win10Button onClick={onMaximize} title={t('desk.windowMaximize')} symbol="▢" disabled={isNarrow} />
          <Win10Button onClick={onClose} title={t('desk.windowClose')} symbol="✕" danger />
        </div>
      </div>

      {/* Content area */}
      <div
        className="flex-1 min-h-0 overflow-y-auto bg-white text-black"
        style={{ margin: 0 }}
      >
        {children}
      </div>

      {/* Resize handles */}
      {canResize && (
        <>
          <div onPointerDown={onResizeStart('n')} onPointerMove={onResizeMove} onPointerUp={endResize} onPointerCancel={endResize} style={{ position: 'absolute', top: -3, left: 8, right: 8, height: 6, cursor: 'ns-resize', zIndex: 10 }} />
          <div onPointerDown={onResizeStart('s')} onPointerMove={onResizeMove} onPointerUp={endResize} onPointerCancel={endResize} style={{ position: 'absolute', bottom: -3, left: 8, right: 8, height: 6, cursor: 'ns-resize', zIndex: 10 }} />
          <div onPointerDown={onResizeStart('w')} onPointerMove={onResizeMove} onPointerUp={endResize} onPointerCancel={endResize} style={{ position: 'absolute', left: -3, top: 8, bottom: 8, width: 6, cursor: 'ew-resize', zIndex: 10 }} />
          <div onPointerDown={onResizeStart('e')} onPointerMove={onResizeMove} onPointerUp={endResize} onPointerCancel={endResize} style={{ position: 'absolute', right: -3, top: 8, bottom: 8, width: 6, cursor: 'ew-resize', zIndex: 10 }} />
          <div onPointerDown={onResizeStart('nw')} onPointerMove={onResizeMove} onPointerUp={endResize} onPointerCancel={endResize} style={{ position: 'absolute', top: -3, left: -3, width: 12, height: 12, cursor: 'nwse-resize', zIndex: 11 }} />
          <div onPointerDown={onResizeStart('ne')} onPointerMove={onResizeMove} onPointerUp={endResize} onPointerCancel={endResize} style={{ position: 'absolute', top: -3, right: -3, width: 12, height: 12, cursor: 'nesw-resize', zIndex: 11 }} />
          <div onPointerDown={onResizeStart('sw')} onPointerMove={onResizeMove} onPointerUp={endResize} onPointerCancel={endResize} style={{ position: 'absolute', bottom: -3, left: -3, width: 12, height: 12, cursor: 'nesw-resize', zIndex: 11 }} />
          <div onPointerDown={onResizeStart('se')} onPointerMove={onResizeMove} onPointerUp={endResize} onPointerCancel={endResize} style={{ position: 'absolute', bottom: -3, right: -3, width: 12, height: 12, cursor: 'nwse-resize', zIndex: 11 }} />
        </>
      )}
    </section>
  )
}

interface Win10ButtonProps {
  symbol: string
  title: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

function Win10Button({ symbol, title, onClick, disabled, danger }: Win10ButtonProps) {
  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onClick() }}
      onPointerDown={(e) => e.stopPropagation()}
      className="flex items-center justify-center w-11 h-full text-[12px] text-[#333] transition-colors disabled:opacity-30"
      style={{ background: 'transparent' }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = danger ? '#e81123' : 'rgba(0,0,0,0.08)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ color: danger ? '' : '#333' }}>{symbol}</span>
    </button>
  )
}
