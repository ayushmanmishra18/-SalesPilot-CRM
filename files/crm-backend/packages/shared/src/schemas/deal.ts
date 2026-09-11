import { z } from 'zod'

export const CreateDealSchema = z.object({
  title:             z.string().min(1, 'Title is required').max(200),
  value:             z.number().min(0, 'Value must be 0 or more'),
  stage:             z.string().min(1, 'Stage is required'),
  contactId:         z.string().optional(),
  expectedCloseDate: z.string().datetime().optional(),
})

export const UpdateDealSchema = CreateDealSchema.partial()

export const MoveDealStageSchema = z.object({
  stage: z.string().min(1),
})

export const CloseDealSchema = z.object({
  status:     z.enum(['won', 'lost']),
  lostReason: z.string().max(500).optional(),
}).refine(
  d => d.status === 'won' || (d.status === 'lost' && !!d.lostReason),
  { message: 'Loss reason is required when marking a deal as lost', path: ['lostReason'] }
)

export const SetDealNextActionSchema = z.object({
  text:    z.string().min(1, 'Action text is required').max(500),
  dueDate: z.string().datetime('Must be a valid UTC date'),
})

export type CreateDealInput       = z.infer<typeof CreateDealSchema>
export type UpdateDealInput       = z.infer<typeof UpdateDealSchema>
export type MoveDealStageInput    = z.infer<typeof MoveDealStageSchema>
export type CloseDealInput        = z.infer<typeof CloseDealSchema>
export type SetDealNextActionInput = z.infer<typeof SetDealNextActionSchema>
