import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Paperclip, Upload, Trash2, FileText, Image, File, ExternalLink } from 'lucide-react'
import { api } from '../../api'
import { Spinner } from '../ui'
import { toast } from '../ui/Toast'
import { formatRelativeTime } from '../../utils/sla'

interface Props {
  relatedTo: { type: 'contact' | 'deal'; id: string }
  canWrite:  boolean
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith('image/'))       return <Image size={14} style={{ color: '#4C8BF5' }} />
  if (mimeType.includes('pdf'))            return <FileText size={14} style={{ color: '#E4483F' }} />
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText size={14} style={{ color: '#4C8BF5' }} />
  return <File size={14} style={{ color: 'var(--text-3)' }} />
}

function formatSize(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentsPanel({ relatedTo, canWrite }: Props) {
  const queryClient = useQueryClient()
  const fileRef     = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const key = `${relatedTo.type}:${relatedTo.id}`

  const { data, isLoading } = useQuery({
    queryKey: ['documents', relatedTo.id],
    queryFn:  () => api.get('/documents', { params: { relatedTo: key } }).then(r => r.data),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['documents', relatedTo.id] })
      toast.success('File removed')
    },
  })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB')
      return
    }

    setUploading(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = () => resolve((reader.result as string).split(',')[1]!)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      await api.post('/documents', {
        name:      file.name,
        mimeType:  file.type || 'application/octet-stream',
        size:      file.size,
        data:      base64,
        relatedTo: { type: relatedTo.type, id: relatedTo.id },
      })

      queryClient.invalidateQueries({ queryKey: ['documents', relatedTo.id] })
      toast.success(`${file.name} uploaded`)
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const documents = data?.documents ?? []

  return (
    <div className="flex flex-col gap-3 pt-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={13} style={{ color: 'var(--text-3)' }} />
          <span className="text-[12px] font-semibold" style={{ color: 'var(--text)' }}>
            Files {documents.length > 0 && `(${documents.length})`}
          </span>
        </div>
        {canWrite && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-[11px] font-medium hover:opacity-80 disabled:opacity-50"
              style={{ color: 'var(--green)' }}>
              {uploading
                ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <Upload size={12} />}
              {uploading ? 'Uploading...' : 'Attach file'}
            </button>
            <input ref={fileRef} type="file" className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.zip,.csv"
              onChange={handleFileChange} />
          </>
        )}
      </div>

      {isLoading ? <Spinner size={14} /> : documents.length === 0 ? (
        <div className="text-[11.5px] py-4 text-center" style={{ color: 'var(--text-3)' }}>
          No files attached yet.{canWrite ? ' Click "Attach file" to upload.' : ''}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {documents.map((doc: any) => (
            <div key={doc.id}
              className="flex items-center gap-3 p-2.5 rounded-[8px] group"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div className="flex-shrink-0">{fileIcon(doc.mimeType)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-medium truncate" style={{ color: 'var(--text)' }}>
                  {doc.name}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                  {formatSize(doc.size)} · {formatRelativeTime(doc.createdAt)}
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Download / open */}
                <a href={doc.url} download={doc.name} target="_blank" rel="noreferrer"
                  className="hover:opacity-80" style={{ color: 'var(--text-3)' }}>
                  <ExternalLink size={12} />
                </a>
                {canWrite && (
                  <button onClick={() => deleteMut.mutate(doc.id)}
                    className="hover:opacity-80" style={{ color: '#E4483F' }}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
