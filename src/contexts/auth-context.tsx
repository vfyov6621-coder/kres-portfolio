'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export interface AuthUser {
  id: string
  username: string
  isAdmin: boolean
  createdAt: string
}

type AuthErrorCode =
  | 'username_invalid'
  | 'password_invalid'
  | 'username_taken'
  | 'invalid_credentials'
  | 'same_password'
  | 'missing_fields'
  | 'invalid_current'
  | 'generic'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: AuthErrorCode }>
  register: (username: string, password: string) => Promise<{ ok: boolean; error?: AuthErrorCode }>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: AuthErrorCode }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function api(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  })
  let data: any = {}
  try {
    data = await res.json()
  } catch {
    // ignore
  }
  return { ok: res.ok, status: res.status, data }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'same-origin' })
      const data = await res.json()
      setUser(data.user ?? null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (username: string, password: string) => {
    const { ok, data } = await api('/api/auth/login', { username, password })
    if (ok && data.user) {
      setUser(data.user)
      return { ok: true }
    }
    return { ok: false, error: (data.error ?? 'generic') as AuthErrorCode }
  }, [])

  const register = useCallback(async (username: string, password: string) => {
    const { ok, data } = await api('/api/auth/register', { username, password })
    if (ok && data.user) {
      setUser(data.user)
      return { ok: true }
    }
    return { ok: false, error: (data.error ?? 'generic') as AuthErrorCode }
  }, [])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const { ok, data } = await api('/api/auth/change-password', { currentPassword, newPassword })
    if (ok) return { ok: true }
    return { ok: false, error: (data.error ?? 'generic') as AuthErrorCode }
  }, [])

  const logout = useCallback(async () => {
    await api('/api/auth/logout')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, changePassword, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
