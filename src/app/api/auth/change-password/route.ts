import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  ensureAdmin,
  verifyPassword,
  hashPassword,
  verifySessionToken,
  SESSION_COOKIE,
} from '@/lib/auth'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Body {
  currentPassword?: string
  newPassword?: string
}

/** POST /api/auth/change-password — change the current user's password. */
export async function POST(request: Request) {
  try {
    await ensureAdmin()
  } catch {
    // ignore
  }

  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const payload = await verifySessionToken(token)

  if (!payload) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const currentPassword = body.currentPassword || ''
  const newPassword = body.newPassword || ''

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }
  if (newPassword.length < 4 || newPassword.length > 100) {
    return NextResponse.json({ error: 'password_invalid' }, { status: 400 })
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: 'same_password' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id: payload.sub } })
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const ok = await verifyPassword(currentPassword, user.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: 'invalid_current' }, { status: 401 })
  }

  const passwordHash = await hashPassword(newPassword)
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  })

  return NextResponse.json({ ok: true })
}
