import { z } from 'zod'

export const CreateTenantSchema = z.object({
  name:       z.string().min(2, 'Company name must be at least 2 characters').max(100),
  adminName:  z.string().min(2).max(100),
  adminEmail: z.string().email('Invalid email'),
})

export const UpdateTenantSchema = z.object({
  name:     z.string().min(2).max(100).optional(),
  currency: z.string().length(3, 'Must be a 3-letter ISO 4217 code').optional(),
  timezone: z.string().min(1).optional(),
})

export const StageSchema = z.object({
  name:       z.string().min(1).max(50),
  order:      z.number().int().min(0),
  isTerminal: z.boolean(),
})

export const UpdateStagesSchema = z.object({
  stages: z.array(StageSchema).min(1, 'At least one stage required'),
})

export type CreateTenantInput = z.infer<typeof CreateTenantSchema>
export type UpdateTenantInput = z.infer<typeof UpdateTenantSchema>
export type UpdateStagesInput = z.infer<typeof UpdateStagesSchema>
