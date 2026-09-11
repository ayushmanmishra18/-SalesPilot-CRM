import mongoose, { Schema, Document } from 'mongoose'

export interface IIdempotencyKey extends Document {
  tenantId:       mongoose.Types.ObjectId
  userId:         mongoose.Types.ObjectId
  idempotencyKey: string
  requestHash:    string
  response:       any
  statusCode:     number
  createdAt:      Date
  expiresAt:      Date
}

const IdempotencyKeySchema = new Schema<IIdempotencyKey>({
  tenantId:       { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  userId:         { type: Schema.Types.ObjectId, ref: 'User',   required: true },
  idempotencyKey: { type: String, required: true },
  requestHash:    { type: String, required: true },
  response:       { type: Schema.Types.Mixed },
  statusCode:     { type: Number },
  expiresAt:      { type: Date, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } })

// TTL auto-expire 24h
IdempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
IdempotencyKeySchema.index(
  { tenantId: 1, userId: 1, idempotencyKey: 1 },
  { unique: true }
)

export const IdempotencyKey = mongoose.model<IIdempotencyKey>('IdempotencyKey', IdempotencyKeySchema)
