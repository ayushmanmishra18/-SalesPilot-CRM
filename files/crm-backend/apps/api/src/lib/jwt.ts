import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface AccessTokenPayload {
  userId:   string
  tenantId: string
  role:     string
}

export interface RefreshTokenPayload {
  userId:   string
  tenantId: string
  family:   string
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as any,
  })
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as any,
  })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwt.accessSecret) as AccessTokenPayload
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as RefreshTokenPayload
}

export function signAdminToken(payload: { adminId: string }): string {
  return jwt.sign(payload, config.jwt.accessSecret + '-admin', { expiresIn: '8h' })
}

export function verifyAdminToken(token: string): { adminId: string } {
  return jwt.verify(token, config.jwt.accessSecret + '-admin') as { adminId: string }
}
