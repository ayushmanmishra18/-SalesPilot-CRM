import mongoose, { Schema, Document } from 'mongoose'

export interface INextAction {
  text:    string
  dueDate: Date
  setBy:   mongoose.Types.ObjectId
  setAt:   Date
}

export interface IContact extends Document {
  publicId:   string
  tenantId:   mongoose.Types.ObjectId
  name:       string
  email:      string | null
  phone:      string | null
  company:    string | null
  jobTitle:   string | null
  notes:      string | null
  leadStatus: string | null   // new | contacted | qualified | nurturing | converted | disqualified
  source:     string | null   // website | referral | cold_outreach | event | social | other
  nextAction: INextAction | null
  deletedAt:  Date | null
  createdAt:  Date
  updatedAt:  Date
}

const NextActionSchema = new Schema<INextAction>({
  text:    { type: String, required: true },
  dueDate: { type: Date,   required: true },
  setBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  setAt:   { type: Date,   required: true },
}, { _id: false })

const ContactSchema = new Schema<IContact>({
  publicId:   { type: String, required: true, unique: true },
  tenantId:   { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name:       { type: String, required: true },
  email:      { type: String, default: null },
  phone:      { type: String, default: null },
  company:    { type: String, default: null },
  jobTitle:   { type: String, default: null },
  notes:      { type: String, default: null },
  leadStatus: { type: String, default: 'new' },
  source:     { type: String, default: null },
  nextAction: { type: NextActionSchema, default: null },
  deletedAt:  { type: Date, default: null },
}, { timestamps: true })

ContactSchema.index({ tenantId: 1, deletedAt: 1, createdAt: -1 })
ContactSchema.index({ tenantId: 1, leadStatus: 1 })
ContactSchema.index({ tenantId: 1, source: 1 })
ContactSchema.index({ tenantId: 1, name: 'text', email: 'text', company: 'text' })

export const Contact = mongoose.model<IContact>('Contact', ContactSchema)
