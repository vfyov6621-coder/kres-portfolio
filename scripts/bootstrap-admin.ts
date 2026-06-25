/**
 * One-time bootstrap script.
 *
 * Creates (or repairs) the admin account and seeds the default portfolio
 * content document. The admin password is read from the ADMIN_PASSWORD env
 * var — it is NEVER hardcoded in this file.
 *
 * USAGE (real Firebase project):
 *   1. In the Firebase Console, add a service account:
 *        Project settings → Service accounts → Generate new private key →
 *        save as `serviceAccount.json` in the project root (DO NOT commit).
 *   2. Run:
 *        ADMIN_PASSWORD='your-secret' \
 *        GOOGLE_APPLICATION_CREDENTIAL=./serviceAccount.json bun run bootstrap
 *
 * USAGE (local emulators):
 *   1. Start emulators in another terminal:  bun run emulators
 *   2. Run:
 *        ADMIN_PASSWORD='your-secret' \
 *        FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 \
 *        FIRESTORE_EMULATOR_HOST=localhost:8080 \
 *        bun run bootstrap
 */

import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { defaultContent } from '../src/lib/portfolio-defaults'

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'kres-portfolio'
const ADMIN_USERNAME = 'kres'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

if (!ADMIN_PASSWORD) {
  console.error('[bootstrap] ERROR: set ADMIN_PASSWORD env var (do NOT hardcode it in the repo).')
  process.exit(1)
}

function emailFor(username: string): string {
  return `${username.toLowerCase()}@portfolio.local`
}

async function main() {
  const useEmulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST
  const keyPath = process.env.SERVICE_ACCOUNT_KEY || 'serviceAccount.json'

  if (getApps().length === 0) {
    if (useEmulator) {
      initializeApp({ projectId: PROJECT_ID })
      console.log('[bootstrap] running against LOCAL EMULATORS')
    } else {
      // Prefer an explicit service account key file (SERVICE_ACCOUNT_KEY env or
      // ./serviceAccount.json), falling back to application default credentials.
      let credential
      try {
        const { cert } = await import('firebase-admin/app')
        credential = cert(keyPath)
        console.log(`[bootstrap] using service account key: ${keyPath}`)
      } catch {
        credential = applicationDefault()
        console.log('[bootstrap] using application default credentials')
      }
      initializeApp({ projectId: PROJECT_ID, credential })
    }
  }

  const auth = getAuth()
  const db = getFirestore()
  // The admin SDK picks up FIREBASE_AUTH_EMULATOR_HOST / FIRESTORE_EMULATOR_HOST
  // automatically when set; no extra wiring needed.

  // 1. Ensure the admin Auth user exists; create or reset password.
  let uid: string
  try {
    const user = await auth.getUserByEmail(emailFor(ADMIN_USERNAME))
    uid = user.uid
    await auth.updateUser(uid, { password: ADMIN_PASSWORD })
    console.log(`[bootstrap] admin auth user exists (${uid}); password reset.`)
  } catch {
    const created = await auth.createUser({
      email: emailFor(ADMIN_USERNAME),
      password: ADMIN_PASSWORD,
      emailVerified: true,
      displayName: ADMIN_USERNAME,
    })
    uid = created.uid
    console.log(`[bootstrap] admin auth user created (${uid}).`)
  }

  // 2. Ensure the admin profile doc with isAdmin: true, status: approved.
  await db
    .collection('users')
    .doc(uid)
    .set(
      {
        username: ADMIN_USERNAME,
        isAdmin: true,
        status: 'approved',
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  console.log(`[bootstrap] admin profile written (isAdmin: true, status: approved).`)

  // 3. Ensure the username uniqueness map.
  await db
    .collection('usernames')
    .doc(ADMIN_USERNAME.toLowerCase())
    .set({ uid, createdAt: FieldValue.serverTimestamp() }, { merge: true })
  console.log(`[bootstrap] username map written.`)

  // 4. Seed the default portfolio content if it does not exist.
  const contentRef = db.collection('portfolio').doc('content')
  const snap = await contentRef.get()
  if (!snap.exists) {
    const defaults = defaultContent()
    await contentRef.set({
      ...defaults,
      updatedAt: FieldValue.serverTimestamp(),
    })
    console.log(`[bootstrap] default portfolio content seeded.`)
  } else {
    console.log(`[bootstrap] portfolio content already exists — left untouched.`)
  }

  console.log(`\n[bootstrap] DONE. Admin login:  ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}`)
}

main().catch((err) => {
  console.error('[bootstrap] FAILED:', err)
  process.exit(1)
})
