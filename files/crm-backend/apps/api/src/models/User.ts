import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  publicId:          string
  tenantId:          mongoose.Types.ObjectId
  name:              string
  email:             string          // globally unique
  authProvider:      'password' | 'google'
  passwordHash:      string | null
  googleId:          string | null
  mustResetPassword: boolean
  role:              'admin' | 'member' | 'viewer'
  status:            'active' | 'invited'
  inviteToken:       string | null   // signed JWT used in accept-invite link
  inviteExpiresAt:   Date | null
  createdAt:         Date
  updatedAt:         Date
}

const UserSchema = new Schema<IUser>({
  publicId:          { type: String, required: true, unique: true },
  tenantId:          { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name:              { type: String, required: true },
  email:             { type: String, required: true, unique: true, lowercase: true, trim: true },
  authProvider:      { type: String, enum: ['password', 'google'], default: 'password' },
  passwordHash:      { type: String, default: null },
  googleId:          { type: String, default: null },
  mustResetPassword: { type: Boolean, default: false },
  role:              { type: String, enum: ['admin', 'member', 'viewer'], required: true },
  status:            { type: String, enum: ['active', 'invited'], default: 'invited' },
  inviteToken:       { type: String, default: null },
  inviteExpiresAt:   { type: Date,   default: null },
}, { timestamps: true })

// email is globally unique — intentional: login resolves tenant from email
UserSchema.index({ email: 1 }, { unique: true })
UserSchema.index({ tenantId: 1, status: 1 })

export const User = mongoose.model<IUser>('User', UserSchema)
