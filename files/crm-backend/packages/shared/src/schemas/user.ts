import { z } from 'zod'
import { ROLES } from '../constants'

export const InviteUserSchema = z.object({
  email: z.string().email('Invalid email'),
  name:  z.string().min(2).max(100),
  role:  z.enum(['admin', 'member', 'viewer'] as const),
})

export const UpdateUserRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer'] as const),
})

export type InviteUserInput     = z.infer<typeof InviteUserSchema>
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>
