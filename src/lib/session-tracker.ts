import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface LoginRecord {
  uid: string
  username: string
  userAgent: string
  platform: string
  ip: string
  country: string
  city: string
  timestamp: ReturnType<typeof serverTimestamp>
}

interface GeoResponse {
  ip?: string
  country?: string
  city?: string
  success?: boolean
}

let cachedGeo: { ip: string; country: string; city: string } | null = null

/** Fetch the client's public IP + geolocation (best-effort, cached). */
async function fetchGeo(): Promise<{ ip: string; country: string; city: string }> {
  if (cachedGeo) return cachedGeo
  const fallback = { ip: 'unknown', country: 'unknown', city: 'unknown' }
  try {
    const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return fallback
    const data = (await res.json()) as GeoResponse
    if (data.success === false) return fallback
    cachedGeo = {
      ip: data.ip ?? 'unknown',
      country: data.country ?? 'unknown',
      city: data.city ?? 'unknown',
    }
    return cachedGeo
  } catch {
    return fallback
  }
}

/** Parse a User-Agent string into a short human-readable device label. */
function describeDevice(ua: string): string {
  let os = 'Unknown OS'
  if (/Windows NT 10/.test(ua)) os = 'Windows'
  else if (/Windows/.test(ua)) os = 'Windows'
  else if (/Mac OS X/.test(ua)) os = 'macOS'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS'
  else if (/Linux/.test(ua)) os = 'Linux'

  let browser = 'Browser'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/Chrome\//.test(ua)) browser = 'Chrome'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Safari\//.test(ua)) browser = 'Safari'

  return `${browser} on ${os}`
}

/**
 * Record a login event for the given user. Stored under users/{uid}/logins
 * so the admin can enumerate per-user sessions. Best-effort — never blocks UI.
 */
export async function recordLogin(uid: string, username: string): Promise<void> {
  try {
    const geo = await fetchGeo()
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const record: Omit<LoginRecord, 'timestamp'> & { timestamp: ReturnType<typeof serverTimestamp> } = {
      uid,
      username,
      userAgent: describeDevice(ua),
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      ip: geo.ip,
      country: geo.country,
      city: geo.city,
      timestamp: serverTimestamp(),
    }
    await addDoc(collection(db, 'users', uid, 'logins'), record)
  } catch {
    // best-effort
  }
}
