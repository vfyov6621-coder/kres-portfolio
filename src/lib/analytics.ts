import { doc, getDoc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * Record a portfolio view for the given signed-in user.
 * - Increments the global totalViews counter on analytics/portfolio.
 * - Upserts analytics/viewers/{uid} with the user's username + view count.
 *
 * Call this once when an approved user lands on the desktop.
 * Safe to call even if the docs don't exist yet (creates them).
 */
export async function recordPortfolioView(uid: string, username: string): Promise<void> {
  try {
    // 1. Global counter — create if missing, otherwise increment.
    const counterRef = doc(db, 'analytics', 'portfolio')
    const snap = await getDoc(counterRef)
    if (!snap.exists()) {
      await setDoc(counterRef, { totalViews: 1, updatedAt: serverTimestamp() })
    } else {
      await updateDoc(counterRef, { totalViews: increment(1), updatedAt: serverTimestamp() })
    }

    // 2. Per-viewer record — create if missing, otherwise increment views + bump lastSeen.
    const viewerRef = doc(db, 'viewers', uid)
    const vSnap = await getDoc(viewerRef)
    if (!vSnap.exists()) {
      await setDoc(viewerRef, {
        uid,
        username,
        views: 1,
        firstSeen: serverTimestamp(),
        lastSeen: serverTimestamp(),
      })
    } else {
      await updateDoc(viewerRef, {
        username,
        views: increment(1),
        lastSeen: serverTimestamp(),
      })
    }
  } catch {
    // Analytics is best-effort; never block the UI on it.
  }
}
