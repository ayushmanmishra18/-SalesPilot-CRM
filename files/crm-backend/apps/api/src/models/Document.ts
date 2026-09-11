import mongoose, { Schema, Document as MongoDoc } from 'mongoose'

export interface IDocument extends MongoDoc {
  publicId:  string
  tenantId:  mongoose.Types.ObjectId
  uploadedBy:mongoose.Types.ObjectId
  relatedTo: { type: 'contact' | 'deal'; id: mongoose.Types.ObjectId }
  name:      string
  url:       string
  size:      number
  mimeType:  string
  createdAt: Date
}

const DocumentSchema = new Schema<IDocument>({
  publicId:   { type: String, required: true, unique: true },
  tenantId:   { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User',   required: true },
  relatedTo: {
    type: { type: String, enum: ['contact', 'deal'], required: true },
    id:   { type: Schema.Types.ObjectId, required: true },
  },
  name:     { type: String, required: true },
  url:      { type: String, required: true },
  size:     { type: Number, default: 0 },
  mimeType: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } })

DocumentSchema.index({ tenantId: 1, 'relatedTo.type': 1, 'relatedTo.id': 1 })

export const Document = mongoose.model<IDocument>('Document', DocumentSchema)
