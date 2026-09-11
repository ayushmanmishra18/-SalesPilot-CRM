import mongoose, { Schema, Document } from 'mongoose'

export interface INotification extends Document {
  publicId:  string
  tenantId:  mongoose.Types.ObjectId
  userId:    mongoose.Types.ObjectId
  type:      string
  message:   string
  relatedTo: { type: string; id: mongoose.Types.ObjectId }
  read:      boolean
  createdAt: Date
}

const NotificationSchema = new Schema<INotification>({
  publicId:  { type: String, required: true, unique: true },
  tenantId:  { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  userId:    { type: Schema.Types.ObjectId, ref: 'User',   required: true },
  type:      { type: String, required: true },
  message:   { type: String, required: true },
  relatedTo: {
    type: { type: String },
    id:   { type: Schema.Types.ObjectId },
  },
  read:      { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } })

// TTL — auto-expire after 90 days (7,776,000 seconds)
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7_776_000 })
NotificationSchema.index({ tenantId: 1, userId: 1, read: 1, createdAt: -1 })

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema)
