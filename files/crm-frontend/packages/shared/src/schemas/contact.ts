import { z } from 'zod'

export const CreateContactSchema = z.object({
  name:     z.string().min(1, 'Name is required').max(100),
  email:    z.string().email('Invalid email').optional().or(z.literal('')),
  phone:    z.string().max(20).optional(),
  company:  z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  notes:    z.string().max(2000).optional(),
})

export const UpdateContactSchema = CreateContactSchema.partial()

export const SetNextActionSchema = z.object({
  text:    z.string().min(1, 'Action text is required').max(500),
  dueDate: z.string().datetime('Must be a valid UTC date'),
})

export type CreateContactInput  = z.infer<typeof CreateContactSchema>
export type UpdateContactInput  = z.infer<typeof UpdateContactSchema>
export type SetNextActionInput  = z.infer<typeof SetNextActionSchema>
