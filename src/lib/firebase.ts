import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
  connectAuthEmulator,
  type Auth,
} from 'firebase/auth'
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore'

/**
 * Firebase client config. These values are PUBLIC by design (they identify
 * your Firebase project to the browser) and are safe to ship in a static
 * build. Security is enforced by Firestore Security Rules + Firebase Auth.
 *
 * Set them in `.env.local` (dev) or as repository secrets (GitHub Actions).
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true'

let app: FirebaseApp
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApps()[0]
}

export const auth: Auth = getAuth(app)
export const db: Firestore = getFirestore(app)

// Connect to local emulators when enabled (dev/testing only).
if (USE_EMULATOR) {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: false })
  } catch {
    // already connected (HMR) — ignore
  }
  try {
    connectFirestoreEmulator(db, 'localhost', 8080)
  } catch {
    // already connected (HMR) — ignore
  }
}

// Persist sessions across reloads (default, but explicit).
void setPersistence(auth, browserLocalPersistence)

/**
 * Convert a portfolio username into the Firebase Auth "email" used for
 * email/password sign-in. Firebase Auth has no native username auth, so we
 * synthesize a stable local address per username.
 */
export function usernameToEmail(username: string): string {
  return `${username.toLowerCase()}@portfolio.local`
}
