import mongoose, { Schema, Document } from 'mongoose'

export interface IActivity extends Document {
  publicId:      string
  tenantId:      mongoose.Types.ObjectId
  type:          'note' | 'task' | 'comment' | 'email'
  text:          string
  authorId:      mongoose.Types.ObjectId
  // `id` is the related Contact/Deal's publicId (string), not its Mongo ObjectId —
  // relatedTo is polymorphic (contact or deal), so a single ObjectId ref isn't even
  // meaningful here; the router has always read/written it as a publicId string.
  relatedTo:     { type: 'contact' | 'deal'; id: string }
  // task only
  dueDate:       Date | null
  done:          boolean
  completedAt:   Date | null
  assigneeId:    mongoose.Types.ObjectId | null
  // comment only
  mentions:      mongoose.Types.ObjectId[]
  replyTo:       mongoose.Types.ObjectId | null
  convertedFrom: mongoose.Types.ObjectId | null
  convertedTo:   mongoose.Types.ObjectId | null
  // email only
  emailSubject:  string | null
  emailTo:       string | null
  createdAt:     Date
}

const ActivitySchema = new Schema<IActivity>({
  publicId:      { type: String, required: true, unique: true },
  tenantId:      { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  type:          { type: String, enum: ['note', 'task', 'comment', 'email'], required: true },
  text:          { type: String, required: true },
  authorId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  relatedTo: {
    type: { type: String, enum: ['contact', 'deal'], required: true },
    id:   { type: String, required: true }, // publicId of the Contact/Deal — see IActivity note above
  },
  // task
  dueDate:       { type: Date,   default: null },
  done:          { type: Boolean, default: false },
  completedAt:   { type: Date,   default: null },
  assigneeId:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
  // comment
  mentions:      [{ type: Schema.Types.ObjectId, ref: 'User' }],
  replyTo:       { type: Schema.Types.ObjectId, ref: 'Activity', default: null },
  convertedFrom: { type: Schema.Types.ObjectId, ref: 'Activity', default: null },
  convertedTo:   { type: Schema.Types.ObjectId, ref: 'Activity', default: null },
  // email
  emailSubject:  { type: String, default: null },
  emailTo:       { type: String, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } })

ActivitySchema.index({ tenantId: 1, 'relatedTo.type': 1, 'relatedTo.id': 1, createdAt: -1 })
ActivitySchema.index({ tenantId: 1, assigneeId: 1, done: 1 })

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema)
