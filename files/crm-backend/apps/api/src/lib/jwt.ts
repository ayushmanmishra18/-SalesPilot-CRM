import jwt from 'jsonwebtoken'
import { config } from '../config'

export interface AccessTokenPayload {
  userId:    string   // publicId — safe for external exposure
  tenantId:  string   // publicId — safe for external exposure
  role:      string
  _userId:   string   // internal Mongo ObjectId (hex) — for DB refs, never exposed to the client
  _tenantId: string   // internal Mongo ObjectId (hex) — for DB refs, never exposed to the client
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as any,
  })
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwt.accessSecret) as AccessTokenPayload
}

export function signAdminToken(payload: { adminId: string }): string {
  return jwt.sign(payload, config.jwt.adminSecret, { expiresIn: '8h' })
}

export function verifyAdminToken(token: string): { adminId: string } {
  return jwt.verify(token, config.jwt.adminSecret) as { adminId: string }
}
