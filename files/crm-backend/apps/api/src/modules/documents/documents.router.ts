import { Request, Response } from 'express'
import { createRouter } from '../../lib/asyncRouter'
import { v4 as uuidv4 } from 'uuid'
import { withTenant, requireRole, requireActiveTenant } from '../../middleware/auth'
import { validate } from '../../middleware/validate'
import { notFound, sendError } from '../../lib/errors'
import { ERROR_CODES } from '@crm/shared'
import { Document } from '../../models/Document'
import { z } from 'zod'

const router = createRouter()
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

// POST /documents
// Accepts either:
//   - `url`  — a pre-signed URL from external storage (S3, Cloudflare R2, etc.), or
//   - `data` — a base64-encoded file body (what the in-app upload UI actually sends),
//              which we store as a data: URI since there's no object-storage service wired up.
// At least one of the two is required.
const CreateDocumentSchema = z.object({
  name:      z.string().min(1).max(200),
  url:       z.string().url('Must be a valid URL').optional(),
  data:      z.string().min(1).optional(),
  mimeType:  z.string().default('application/octet-stream'),
  size:      z.number().int().min(0).default(0),
  relatedTo: z.object({
    type: z.enum(['contact', 'deal']),
    id:   z.string().min(1),
  }),
}).refine(d => !!d.url || !!d.data, { message: 'Either url or data is required', path: ['data'] })

router.post('/', requireRole('admin', 'member'), validate(CreateDocumentSchema),
  async (req: Request, res: Response) => {
    const { name, url, data, mimeType, size, relatedTo } = req.body

    // Roughly re-check the decoded size against the 10MB limit the upload UI advertises —
    // base64 already passed through the 15mb body-parser limit, but a raw sanity check here
    // gives a clean 400 instead of surprising failures downstream.
    if (data) {
      const approxBytes = Math.floor((data.length * 3) / 4)
      if (approxBytes > 10 * 1024 * 1024) {
        sendError(res, 400, ERROR_CODES.VALIDATION_ERROR, 'File must be under 10MB')
        return
      }
    }

    const doc = await Document.create({
      publicId:   uuidv4(),
      tenantId:   req.auth!._tenantId,
      uploadedBy: req.auth!._userId,
      name,
      url:        url ?? `data:${mimeType};base64,${data}`,
      mimeType,
      size,
      relatedTo,
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
