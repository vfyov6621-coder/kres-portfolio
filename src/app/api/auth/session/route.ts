import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  ensureAdmin,
  verifySessionToken,
  publicUser,
  SESSION_COOKIE,
} from '@/lib/auth'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/auth/session — returns the current authenticated user, or null. */
export async function GET() {
  // Make sure the admin account always exists.
  try {
    await ensureAdmin()
  } catch {
    // ignore seed errors (e.g. during build)
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const payload = await verifySessionToken(token)

  if (!payload) {
    return NextResponse.json({ user: null })
  }

  // Confirm the user still exists in the database.
  const user = await db.user.findUnique({ where: { id: payload.sub } })
  if (!user) {
    return NextResponse.json({ user: null })
  }

  return NextResponse.json({ user: publicUser(user) })
}
