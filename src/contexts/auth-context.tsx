'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  EmailAuthProvider,
  type User as FbUser,
} from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db, usernameToEmail } from '@/lib/firebase'

export type UserStatus = 'pending' | 'approved' | 'rejected'

export interface AuthUser {
  id: string
  username: string
  isAdmin: boolean
  status: UserStatus
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

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

interface UserProfile {
  username: string
  isAdmin: boolean
  status?: UserStatus
  createdAt: ReturnType<typeof serverTimestamp> | string
}

/** Build the public user shape from a Firebase user + Firestore profile. */
function toAuthUser(fbUser: FbUser, profile: { username: string; isAdmin: boolean; status?: UserStatus; createdAt?: unknown }): AuthUser {
  let createdAt = ''
  const c = profile.createdAt
  if (c && typeof c === 'object' && 'toMillis' in (c as object)) {
    // Firestore Timestamp
    createdAt = new Date((c as { toMillis: () => number }).toMillis()).toISOString()
  } else if (typeof c === 'string') {
    createdAt = c
  } else if (fbUser.metadata?.creationTime) {
    createdAt = fbUser.metadata.creationTime
  }
  return {
    id: fbUser.uid,
    username: profile.username,
    isAdmin: profile.isAdmin,
    status: profile.status ?? (profile.isAdmin ? 'approved' : 'pending'),
    createdAt,
  }
}

/** Map Firebase error codes to the app's stable error codes. */
function mapError(err: unknown): AuthErrorCode {
  const code = (err as { code?: string })?.code ?? ''
  switch (code) {
    case 'auth/email-already-in-use':
      return 'username_taken'
    case 'auth/invalid-email':
      return 'username_invalid'
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return 'password_invalid'
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-login-credentials':
      return 'invalid_credentials'
    case 'auth/requires-recent-login':
      return 'invalid_current'
    case 'auth/missing-fields':
      return 'missing_fields'
    default:
      return 'generic'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Listen to Firebase Auth state; fetch the Firestore profile for isAdmin.
  useEffect(() => {
    let cancelled = false
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (cancelled) return
      if (!fbUser) {
        setUser(null)
        setLoading(false)
        return
      }
      try {
        const snap = await getDoc(doc(db, 'users', fbUser.uid))
        if (snap.exists()) {
          const profile = snap.data() as UserProfile
          setUser(toAuthUser(fbUser, profile))
        } else {
          // Profile missing (shouldn't normally happen) — sign out gracefully.
          setUser(null)
        }
      } catch {
        setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  const refresh = useCallback(async () => {
    const fbUser = auth.currentUser
    if (!fbUser) {
      setUser(null)
      return
    }
    try {
      const snap = await getDoc(doc(db, 'users', fbUser.uid))
      if (snap.exists()) {
        setUser(toAuthUser(fbUser, snap.data() as UserProfile))
      }
    } catch {
      // ignore
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const uname = username.trim()
    if (!USERNAME_RE.test(uname)) return { ok: false, error: 'username_invalid' as AuthErrorCode }
    if (password.length < 6) return { ok: false, error: 'password_invalid' as AuthErrorCode }
    try {
      await signInWithEmailAndPassword(auth, usernameToEmail(uname), password)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: mapError(err) }
    }
  }, [])

  const register = useCallback(async (username: string, password: string) => {
    const uname = username.trim()
    if (!USERNAME_RE.test(uname)) return { ok: false, error: 'username_invalid' as AuthErrorCode }
    if (password.length < 6 || password.length > 100) {
      return { ok: false, error: 'password_invalid' as AuthErrorCode }
    }

    // Pre-check the username uniqueness map (best-effort; rules enforce it too).
    try {
      const nameSnap = await getDoc(doc(db, 'usernames', uname.toLowerCase()))
      if (nameSnap.exists()) {
        return { ok: false, error: 'username_taken' as AuthErrorCode }
      }
    } catch {
      // ignore — rules will still block the final write
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, usernameToEmail(uname), password)
      const uid = cred.user.uid
      // Create the profile doc + username uniqueness doc.
      await setDoc(doc(db, 'users', uid), {
        username: uname,
        isAdmin: false,
        status: 'pending' as UserStatus,
        createdAt: serverTimestamp(),
      })
      await setDoc(doc(db, 'usernames', uname.toLowerCase()), {
        uid,
        createdAt: serverTimestamp(),
      })
      return { ok: true }
    } catch (err) {
      // If auth user was created but the profile write failed, clean up.
      const code = (err as { code?: string })?.code ?? ''
      if (auth.currentUser && code !== 'auth/email-already-in-use') {
        try { await auth.currentUser.delete() } catch { /* ignore */ }
      }
      return { ok: false, error: mapError(err) }
    }
  }, [])

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const fbUser = auth.currentUser
    if (!fbUser) return { ok: false, error: 'invalid_credentials' as AuthErrorCode }
    if (!currentPassword || !newPassword) return { ok: false, error: 'missing_fields' as AuthErrorCode }
    if (newPassword.length < 6 || newPassword.length > 100) {
      return { ok: false, error: 'password_invalid' as AuthErrorCode }
    }
    if (newPassword === currentPassword) return { ok: false, error: 'same_password' as AuthErrorCode }

    try {
      const email = fbUser.email ?? usernameToEmail(fbUser.displayName ?? '')
      const credential = EmailAuthProvider.credential(email, currentPassword)
      await reauthenticateWithCredential(fbUser, credential)
      await updatePassword(fbUser, newPassword)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: mapError(err) }
    }
  }, [])

  const logout = useCallback(async () => {
    try { await signOut(auth) } catch { /* ignore */ }
  }, [])

  // Reference the collection import so tree-shaking keeps it for the rules
  // introspection tooling; harmless no-op.
  void collection

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
