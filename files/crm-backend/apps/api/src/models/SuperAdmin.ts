import mongoose, { Schema, Document } from 'mongoose'

export interface ISuperAdmin extends Document {
  name:        string
  email:       string
  passwordHash:string
  lastLoginAt: Date | null
  createdAt:   Date
  updatedAt:   Date
}

const SuperAdminSchema = new Schema<ISuperAdmin>({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  lastLoginAt:  { type: Date, default: null },
}, { timestamps: true })

SuperAdminSchema.index({ email: 1 }, { unique: true })

export const SuperAdmin = mongoose.model<ISuperAdmin>('SuperAdmin', SuperAdminSchema)
