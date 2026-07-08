import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/auth/logout — clear the session cookie. */
export async function POST() {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return NextResponse.json({ ok: true })
}
