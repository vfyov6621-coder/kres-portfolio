import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'kres-os-dev-secret-change-me-in-production-190565'
)

const COOKIE_NAME = 'kres_session'
const SESSION_TTL = '7d'

export interface SessionPayload {
  sub: string
  username: string
  isAdmin: boolean
}

/** Hash a plaintext password using bcrypt. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/** Verify a plaintext password against a hash. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/** Create a signed JWT for a user. */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(JWT_SECRET)
}

/** Verify a JWT and return its payload, or null if invalid/expired. */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      sub: payload.sub as string,
      username: payload.username as string,
      isAdmin: payload.isAdmin as boolean,
    }
  } catch {
    return null
  }
}

export const SESSION_COOKIE = COOKIE_NAME

/** Idempotently ensure the admin account (kres / 190565) exists. */
export async function ensureAdmin(): Promise<void> {
  const existing = await db.user.findUnique({ where: { username: 'kres' } })
  if (existing) return
  const hash = await hashPassword('190565')
  await db.user.create({
    data: {
      username: 'kres',
      passwordHash: hash,
      isAdmin: true,
    },
  })
}

/** Public user shape (never expose passwordHash). */
export function publicUser(user: { id: string; username: string; isAdmin: boolean; createdAt: Date }) {
  return {
    id: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
  }
}
