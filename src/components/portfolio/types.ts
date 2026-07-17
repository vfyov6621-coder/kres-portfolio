import type { ComponentType, CSSProperties } from 'react'
import type { LucideProps } from 'lucide-react'
import { Info, FolderClosed, Cpu, Mail, Settings, BarChart3, Terminal, MonitorSmartphone, MessageSquare, Gamepad2, Users } from 'lucide-react'

export type WindowId = 'about' | 'projects' | 'skills' | 'contact' | 'settings' | 'analytics' | 'console' | 'devices' | 'chat' | 'minigames' | 'users'

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
  adminOnly?: boolean
}

export const WINDOWS: WindowMeta[] = [
  { id: 'about', labelKey: 'desk.about', Icon: Info },
  { id: 'projects', labelKey: 'desk.projects', Icon: FolderClosed },
  { id: 'skills', labelKey: 'desk.skills', Icon: Cpu },
  { id: 'contact', labelKey: 'desk.contact', Icon: Mail },
  { id: 'settings', labelKey: 'desk.settings', Icon: Settings },
  { id: 'minigames', labelKey: 'desk.minigames', Icon: Gamepad2 },
  { id: 'chat', labelKey: 'desk.chat', Icon: MessageSquare },
  { id: 'analytics', labelKey: 'desk.analytics', Icon: BarChart3, adminOnly: true },
  { id: 'console', labelKey: 'desk.console', Icon: Terminal, adminOnly: true },
  { id: 'devices', labelKey: 'desk.devices', Icon: MonitorSmartphone, adminOnly: true },
  { id: 'users', labelKey: 'desk.users', Icon: Users, adminOnly: true },
]

export const DEFAULT_WINDOW_W = 560
export const DEFAULT_WINDOW_H = 420
export const WINDOW_CASCADE = 28

// Win10 flat style — no bevels, just subtle shadows + thin borders.
export const BEVEL_OUT: CSSProperties = {
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  border: '1px solid rgba(0,0,0,0.1)',
}

export const BEVEL_IN: CSSProperties = {
  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
}

export const BEVEL_OUT_THIN: CSSProperties = {
  border: '1px solid rgba(0,0,0,0.12)',
  boxShadow: 'none',
}

export const BEVEL_IN_THIN: CSSProperties = {
  boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
  border: 'none',
}

// Win10 color palette
export const FACE = '#f3f3f3'
export const FACE_DARK = '#e8e8e8'
export const FACE_LIGHT = '#ffffff'
export const ACCENT = '#0078d4' // Win10 blue accent
export const ACCENT_HOVER = '#1a86d9'
export const SHADOW = '#808080'
