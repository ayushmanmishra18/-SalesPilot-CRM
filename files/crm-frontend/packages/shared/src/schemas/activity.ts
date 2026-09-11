import { z } from 'zod'

export const CreateActivitySchema = z.discriminatedUnion('type', [
  z.object({
    type:       z.literal('note'),
    text:       z.string().min(1, 'Note text is required').max(5000),
    relatedTo:  z.object({ type: z.enum(['contact', 'deal']), id: z.string() }),
  }),
  z.object({
    type:       z.literal('task'),
    text:       z.string().min(1, 'Task title is required').max(500),
    dueDate:    z.string().datetime('Must be a valid UTC date'),
    assigneeId: z.string().optional(),
    relatedTo:  z.object({ type: z.enum(['contact', 'deal']), id: z.string() }),
  }),
  z.object({
    type:      z.literal('comment'),
    text:      z.string().min(1, 'Comment cannot be empty').max(5000),
    mentions:  z.array(z.string()).default([]),
    replyTo:   z.string().optional(),
    relatedTo: z.object({ type: z.enum(['contact', 'deal']), id: z.string() }),
  }),
  z.object({
    type:         z.literal('email'),
    text:         z.string().min(1).max(10000),
    emailSubject: z.string().min(1, 'Subject is required').max(200),
    emailTo:      z.string().email('Invalid recipient email'),
    relatedTo:    z.object({ type: z.enum(['contact', 'deal']), id: z.string() }),
  }),
])

export const ConvertToTaskSchema = z.object({
  text:       z.string().min(1).max(500),
  dueDate:    z.string().datetime(),
  assigneeId: z.string().optional(),
})

export type CreateActivityInput  = z.infer<typeof CreateActivitySchema>
export type ConvertToTaskInput   = z.infer<typeof ConvertToTaskSchema>
