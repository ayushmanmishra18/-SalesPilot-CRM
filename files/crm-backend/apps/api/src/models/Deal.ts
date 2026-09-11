import mongoose, { Schema, Document } from 'mongoose'

export interface IStageHistoryEntry {
  stage:   string
  movedBy: mongoose.Types.ObjectId
  movedAt: Date
}

export interface INextAction {
  text:    string
  dueDate: Date
  setBy:   mongoose.Types.ObjectId
  setAt:   Date
}

export interface IDeal extends Document {
  publicId:          string
  tenantId:          mongoose.Types.ObjectId
  title:             string
  value:             number
  stage:             string
  stageHistory:      IStageHistoryEntry[]
  expectedCloseDate: Date | null
  contactId:         mongoose.Types.ObjectId | null
  ownerId:           mongoose.Types.ObjectId
  status:            'open' | 'won' | 'lost'
  lostReason:        string | null
  nextAction:        INextAction | null
  deletedAt:         Date | null
  createdAt:         Date
  updatedAt:         Date
}

const StageHistorySchema = new Schema<IStageHistoryEntry>({
  stage:   { type: String, required: true },
  movedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  movedAt: { type: Date, required: true },
}, { _id: false })

const NextActionSchema = new Schema<INextAction>({
  text:    { type: String, required: true },
  dueDate: { type: Date,   required: true },
  setBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  setAt:   { type: Date,   required: true },
}, { _id: false })

const DealSchema = new Schema<IDeal>({
  publicId:          { type: String, required: true, unique: true },
  tenantId:          { type: Schema.Types.ObjectId, ref: 'Tenant',  required: true },
  title:             { type: String, required: true },
  value:             { type: Number, default: 0 },
  stage:             { type: String, required: true },
  stageHistory:      { type: [StageHistorySchema], default: [] },
  expectedCloseDate: { type: Date, default: null },
  contactId:         { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
  ownerId:           { type: Schema.Types.ObjectId, ref: 'User',    required: true },
  status:            { type: String, enum: ['open', 'won', 'lost'], default: 'open' },
  lostReason:        { type: String, default: null },
  nextAction:        { type: NextActionSchema, default: null },
  deletedAt:         { type: Date, default: null },
}, { timestamps: true })

DealSchema.index({ tenantId: 1, status: 1, 'nextAction.dueDate': 1 })
DealSchema.index({ tenantId: 1, stage: 1 })
DealSchema.index({ tenantId: 1, ownerId: 1 })

export const Deal = mongoose.model<IDeal>('Deal', DealSchema)
