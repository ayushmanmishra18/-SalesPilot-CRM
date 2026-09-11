import mongoose, { Schema, Document } from 'mongoose'
import { DEFAULT_STAGES, DEFAULT_SLA_CONFIG } from '@crm/shared'

export interface IStage {
  name:       string
  order:      number
  isTerminal: boolean
}

export interface ISlaConfig {
  atRiskWindowDays:       number
  unscheduledGraceHours:  number
  notifyOnOverdue:        boolean
  notifyOwnerDailyDigest: boolean
}

export interface ITenant extends Document {
  publicId:         string
  name:             string
  currency:         string
  timezone:         string
  status:           'active' | 'suspended'
  stages:           IStage[]
  slaConfig:        ISlaConfig
  createdByAdminId: mongoose.Types.ObjectId
  createdAt:        Date
  updatedAt:        Date
}

const TenantSchema = new Schema<ITenant>({
  publicId:         { type: String, required: true, unique: true },
  name:             { type: String, required: true },
  currency:         { type: String, default: 'USD' },
  timezone:         { type: String, default: 'UTC' },
  status:           { type: String, enum: ['active', 'suspended'], default: 'active' },
  stages:           { type: [{ name: String, order: Number, isTerminal: Boolean }], default: DEFAULT_STAGES },
  slaConfig: {
    atRiskWindowDays:       { type: Number, default: DEFAULT_SLA_CONFIG.atRiskWindowDays },
    unscheduledGraceHours:  { type: Number, default: DEFAULT_SLA_CONFIG.unscheduledGraceHours },
    notifyOnOverdue:        { type: Boolean, default: true },
    notifyOwnerDailyDigest: { type: Boolean, default: false },
  },
  createdByAdminId: { type: Schema.Types.ObjectId, ref: 'SuperAdmin' },
}, { timestamps: true })

export const Tenant = mongoose.model<ITenant>('Tenant', TenantSchema)
