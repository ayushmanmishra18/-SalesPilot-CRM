import mongoose, { Schema, Document } from 'mongoose'

export interface IRefreshToken extends Document {
  tenantId:          mongoose.Types.ObjectId
  userId:            mongoose.Types.ObjectId
  tokenHash:         string           // bcrypt hash of the raw token
  family:            string           // UUID — all rotations of one session share this
  replacedByTokenHash: string | null  // chain for reuse detection
  createdAt:         Date
  expiresAt:         Date
  revokedAt:         Date | null
  deviceInfo:        string
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
  tenantId:            { type: Schema.Types.ObjectId, ref: 'Tenant',  required: true },
  userId:              { type: Schema.Types.ObjectId, ref: 'User',    required: true },
  tokenHash:           { type: String, required: true },
  family:              { type: String, required: true },
  replacedByTokenHash: { type: String, default: null },
  expiresAt:           { type: Date,   required: true },
  revokedAt:           { type: Date,   default: null },
  deviceInfo:          { type: String, default: '' },
}, { timestamps: true })

// TTL index — MongoDB auto-deletes expired tokens
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
RefreshTokenSchema.index({ tenantId: 1, userId: 1, revokedAt: 1 })
RefreshTokenSchema.index({ tokenHash: 1 })

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema)
