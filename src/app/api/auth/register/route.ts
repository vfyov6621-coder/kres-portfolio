import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  ensureAdmin,
  hashPassword,
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

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

/** POST /api/auth/register — create a new account and start a session. */
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

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({ error: 'username_invalid' }, { status: 400 })
  }
  if (password.length < 4 || password.length > 100) {
    return NextResponse.json({ error: 'password_invalid' }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json({ error: 'username_taken' }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)
  const user = await db.user.create({
    data: { username, passwordHash, isAdmin: false },
  })

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
