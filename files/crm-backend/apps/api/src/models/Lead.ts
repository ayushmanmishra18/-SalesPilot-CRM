import mongoose, { Schema, Document } from 'mongoose'

// Public marketing-site leads (the landing page's "Let's get your team organised" form).
// Stored independently of the WhatsApp handoff so a submission is never lost just because
// a visitor opened WhatsApp and then didn't hit send.
export interface ILead extends Document {
  name:       string
  phone:      string
  company:    string | null
  teamSize:   string | null
  challenge:  string | null
  contacted:  boolean
  createdAt:  Date
}

const LeadSchema = new Schema<ILead>({
  name:      { type: String, required: true },
  phone:     { type: String, required: true },
  company:   { type: String, default: null },
  teamSize:  { type: String, default: null },
  challenge: { type: String, default: null },
  contacted: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } })

LeadSchema.index({ createdAt: -1 })

export const Lead = mongoose.model<ILead>('Lead', LeadSchema)
