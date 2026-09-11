import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { withTenant, requireRole, requireActiveTenant } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { notFound, sendError } from '../../lib/errors'
import { ERROR_CODES } from '@crm/shared'
import { Document } from '../../models/Document'
import { z } from 'zod'

const router = Router()
router.use(withTenant, requireActiveTenant)

function serialize(d: any) {
  return {
    id:          d.publicId,
    name:        d.name,
    url:         d.url,
    mimeType:    d.mimeType,
    size:        d.size,
    relatedTo:   d.relatedTo,
    uploadedBy:  d.uploadedBy,
    createdAt:   d.createdAt,
  }
}

// GET /documents?relatedTo=deal:publicId
router.get('/', async (req: Request, res: Response) => {
  const { relatedTo } = req.query as any
  if (!relatedTo) { sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'relatedTo is required'); return }

  const [type, id] = (relatedTo as string).split(':')
  if (!type || !id) { sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'relatedTo format: type:publicId'); return }

  const docs = await Document.find({
    tenantId:          req.auth!._tenantId,
    'relatedTo.type':  type,
    'relatedTo.id':    id,
  }).sort({ createdAt: -1 }).lean()

  res.json({ documents: docs.map(serialize) })
})

// POST /documents  — v1: client provides a URL (pre-signed S3, Cloudflare R2, etc.)
// Full file upload via multipart/form-data is a v2 concern; URL-based avoids needing storage infra now.
router.post('/', requireRole('admin', 'member'),
  validate(z.object({
    name:      z.string().min(1).max(200),
    url:       z.string().url('Must be a valid URL'),
    mimeType:  z.string().default('application/octet-stream'),
    size:      z.number().int().min(0).default(0),
    relatedTo: z.object({
      type: z.enum(['contact', 'deal']),
      id:   z.string().min(1),
    }),
  })),
  async (req: Request, res: Response) => {
    const doc = await Document.create({
      publicId:   uuidv4(),
      tenantId:   req.auth!._tenantId,
      uploadedBy: req.auth!._userId,
      ...req.body,
    })
    res.status(201).json({ document: serialize(doc.toObject()) })
  }
)

// DELETE /documents/:id
router.delete('/:id', requireRole('admin', 'member'), async (req: Request, res: Response) => {
  const doc = await Document.findOneAndDelete({
    publicId: req.params.id,
    tenantId: req.auth!._tenantId,
  })
  if (!doc) { notFound(res, 'Document'); return }
  res.json({ ok: true })
})

export default router
