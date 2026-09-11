import mongoose, { Schema, Document } from 'mongoose'

export interface IEmailAccount extends Document {
  publicId:          string
  tenantId:          mongoose.Types.ObjectId
  userId:            mongoose.Types.ObjectId
  provider:          'google' | 'microsoft'
  emailAddress:      string
  oauthRefreshToken: string   // encrypted at rest — store as-is for v1, add KMS in v2
  connectedAt:       Date
  lastUsedAt:        Date | null
  status:            'active' | 'revoked'
}

const EmailAccountSchema = new Schema<IEmailAccount>({
  publicId:          { type: String, required: true, unique: true },
  tenantId:          { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  userId:            { type: Schema.Types.ObjectId, ref: 'User',   required: true },
  provider:          { type: String, enum: ['google', 'microsoft'], required: true },
  emailAddress:      { type: String, required: true },
  oauthRefreshToken: { type: String, required: true },
  connectedAt:       { type: Date, default: Date.now },
  lastUsedAt:        { type: Date, default: null },
  status:            { type: String, enum: ['active', 'revoked'], default: 'active' },
}, { timestamps: true })

EmailAccountSchema.index({ tenantId: 1, userId: 1 }, { unique: true })

export const EmailAccount = mongoose.model<IEmailAccount>('EmailAccount', EmailAccountSchema)
