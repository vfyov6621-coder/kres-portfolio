import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  ensureAdmin,
  verifyPassword,
  createSessionToken,
  publicUser,
  SESSION_COOKIE,
} from '@/lib/auth'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Body {
  username?: string
  password?: string
}

/** POST /api/auth/login — verify credentials and start a session. */
export async function POST(request: Request) {
  try {
    await ensureAdmin()
  } catch {
    // ignore
  }

  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const username = (body.username || '').trim()
  const password = body.password || ''

  if (!username || !password) {
    return NextResponse.json({ error: 'missing_credentials' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { username } })
  if (!user) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const ok = await verifyPassword(password, user.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 })
  }

  const token = await createSessionToken({
    sub: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
  })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  return NextResponse.json({ user: publicUser(user) })
}
