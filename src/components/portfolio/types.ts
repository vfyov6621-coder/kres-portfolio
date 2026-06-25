import type { ComponentType, CSSProperties } from 'react'
import type { LucideProps } from 'lucide-react'
import { Info, FolderClosed, Cpu, Mail, Settings, BarChart3, Terminal, MonitorSmartphone } from 'lucide-react'

export type WindowId = 'about' | 'projects' | 'skills' | 'contact' | 'settings' | 'analytics' | 'console' | 'devices'

export interface WindowState {
  id: WindowId
  minimized: boolean
  maximized: boolean
  z: number
  x: number
  y: number
  w: number
  h: number
}

export interface WindowMeta {
  id: WindowId
  labelKey: string
  Icon: ComponentType<LucideProps>
}

export const WINDOWS: WindowMeta[] = [
  { id: 'about', labelKey: 'desk.about', Icon: Info },
  { id: 'projects', labelKey: 'desk.projects', Icon: FolderClosed },
  { id: 'skills', labelKey: 'desk.skills', Icon: Cpu },
  { id: 'contact', labelKey: 'desk.contact', Icon: Mail },
  { id: 'settings', labelKey: 'desk.settings', Icon: Settings },
  { id: 'analytics', labelKey: 'desk.analytics', Icon: BarChart3 },
  { id: 'console', labelKey: 'desk.console', Icon: Terminal },
  { id: 'devices', labelKey: 'desk.devices', Icon: MonitorSmartphone },
]

export const DEFAULT_WINDOW_W = 520
export const DEFAULT_WINDOW_H = 400
export const WINDOW_CASCADE = 26

// Classic Win98 raised/outset bevel (4-side, two-tone).
export const BEVEL_OUT: CSSProperties = {
  boxShadow:
    'inset -1px -1px 0 0 #000, inset 1px 1px 0 0 #fff, inset -2px -2px 0 0 #808080, inset 2px 2px 0 0 #dfdfdf',
}

// Classic Win98 pressed/inset bevel (4-side, two-tone).
export const BEVEL_IN: CSSProperties = {
  boxShadow:
    'inset 1px 1px 0 0 #000, inset -1px -1px 0 0 #fff, inset 2px 2px 0 0 #808080, inset -2px -2px 0 0 #dfdfdf',
}

// Thin single-pixel bevels (for buttons / tiles).
export const BEVEL_OUT_THIN: CSSProperties = {
  boxShadow: 'inset -1px -1px 0 0 #000, inset 1px 1px 0 0 #fff',
}

export const BEVEL_IN_THIN: CSSProperties = {
  boxShadow: 'inset 1px 1px 0 0 #000, inset -1px -1px 0 0 #fff',
}

// Win98 face color (the classic gray).
export const FACE = '#c0c0c0'
export const FACE_DARK = '#9a9a9a'
export const FACE_LIGHT = '#d8d8d8'
export const SHADOW = '#808080'
