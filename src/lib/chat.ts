import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface ChatMessage {
  id: string
  text: string
  uid: string
  username: string
  createdAt: Timestamp | null
}

const COOLDOWN_MS = 30_000 // 30 seconds between messages per user
const COOLDOWN_KEY = 'kres_chat_last_msg'
const MAX_LEN = 500

/**
 * Returns the timestamp (ms) of the last message sent by this user in this
 * browser, or 0 if none. Used to enforce the 30-second cooldown client-side.
 */
export function getLastMessageTime(): number {
  if (typeof window === 'undefined') return 0
  return Number(window.localStorage.getItem(COOLDOWN_KEY) || '0')
}

/** Returns milliseconds remaining until the user can send another message. */
export function cooldownRemaining(): number {
  const elapsed = Date.now() - getLastMessageTime()
  return Math.max(0, COOLDOWN_MS - elapsed)
}

/** Returns true if the user is currently on cooldown. */
export function isOnCooldown(): boolean {
  return cooldownRemaining() > 0
}

/**
 * Compute the cutoff timestamp for "today 00:00 Moscow time".
 * Messages older than this should be deleted / hidden.
 * Moscow = UTC+3 (no DST since 2014).
 */
export function getMoscowMidnight(): Date {
  const now = new Date()
  // Current time in Moscow (UTC+3)
  const moscowNowMs = now.getTime() + 3 * 3600_000
  const moscowToday = new Date(moscowNowMs)
  moscowToday.setUTCHours(0, 0, 0, 0)
  // Convert back to UTC
  return new Date(moscowToday.getTime() - 3 * 3600_000)
}

/**
 * Subscribe to chat messages in real-time. Only shows messages from after
 * today 00:00 MSK (auto-clear). Calls onMessages with the latest array.
 * Returns an unsubscribe function.
 */
export function subscribeToChat(
  onMessages: (messages: ChatMessage[]) => void,
  onError?: () => void,
): () => void {
  const cutoff = getMoscowMidnight()
  const q = query(
    collection(db, 'messages'),
    where('createdAt', '>=', cutoff),
    orderBy('createdAt', 'asc'),
  )
  return onSnapshot(
    q,
    (snap) => {
      const msgs: ChatMessage[] = []
      snap.forEach((d) => {
        msgs.push({ id: d.id, ...(d.data() as Omit<ChatMessage, 'id'>) })
      })
      onMessages(msgs)
    },
    () => {
      if (onError) onError()
    },
  )
}

/**
 * Send a chat message. Enforces the 30-second cooldown client-side.
 * Returns { ok: true } or { ok: false, error: 'cooldown' | 'too_long' | 'generic' }.
 */
export async function sendChatMessage(
  uid: string,
  username: string,
  text: string,
): Promise<{ ok: boolean; error?: 'cooldown' | 'too_long' | 'generic' }> {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: 'generic' }
  if (trimmed.length > MAX_LEN) return { ok: false, error: 'too_long' }
  if (isOnCooldown()) return { ok: false, error: 'cooldown' }

  try {
    await addDoc(collection(db, 'messages'), {
      text: trimmed,
      uid,
      username,
      createdAt: serverTimestamp(),
    })
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(COOLDOWN_KEY, String(Date.now()))
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'generic' }
  }
}

/**
 * Delete expired messages (older than today 00:00 MSK). Best-effort — any
 * signed-in user can do this; rules allow it. Called once on chat window open.
 */
export async function cleanupExpiredMessages(): Promise<void> {
  try {
    const { getDocs } = await import('firebase/firestore')
    const cutoff = getMoscowMidnight()
    const q = query(
      collection(db, 'messages'),
      where('createdAt', '<', cutoff),
    )
    const snap = await getDocs(q)
    const deletes: Promise<void>[] = []
    snap.forEach((d) => {
      deletes.push(deleteDoc(doc(db, 'messages', d.id)))
    })
    await Promise.all(deletes)
  } catch {
    // best-effort
  }
}
