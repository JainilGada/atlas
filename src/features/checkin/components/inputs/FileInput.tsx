import { useRef, useState } from 'react'
import { Paperclip, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SupabaseClient } from '@/lib/supabase'
import type { FileRef } from '@/lib/types'

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf', 'video/mp4']

interface FileInputProps {
  files: FileRef[]
  multiple: boolean
  accept: string
  db: SupabaseClient
  userId: string
  date: string
  taskId: string
  onChange: (files: FileRef[]) => void
  disabled?: boolean
}

export function FileInput({ files, multiple, accept, db, userId, date, taskId, onChange, disabled }: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(picked: FileList | null) {
    if (!picked || picked.length === 0) return
    setError(null)
    setUploading(true)

    const newRefs: FileRef[] = []
    try {
      for (const file of Array.from(picked)) {
        if (!ALLOWED.includes(file.type)) {
          setError(`Unsupported file type: ${file.type}`)
          continue
        }
        if (file.size > MAX_SIZE) {
          setError(`${file.name} exceeds the 20 MB limit`)
          continue
        }
        const path = `${userId}/${date}/${taskId}/${crypto.randomUUID()}-${file.name}`
        const { error: upErr } = await db.storage.from('task-files').upload(path, file)
        if (upErr) throw upErr
        const { data } = db.storage.from('task-files').getPublicUrl(path)
        newRefs.push({ url: data.publicUrl, name: file.name, size: file.size, type: file.type })
      }
      onChange(multiple ? [...files, ...newRefs] : newRefs.slice(0, 1))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function removeFile(url: string) {
    onChange(files.filter(f => f.url !== url))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {files.map(f => (
          f.type.startsWith('image/') ? (
            <div key={f.url} className="relative group">
              <img
                src={f.url}
                alt={f.name}
                className="h-24 w-24 object-cover rounded-lg border"
              />
              {!disabled && (
                <button
                  onClick={() => removeFile(f.url)}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ) : (
            <div key={f.url} className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs max-w-[200px]">
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{f.name}</span>
              {!disabled && (
                <button onClick={() => removeFile(f.url)} className="shrink-0 hover:text-destructive" aria-label="Remove">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )
        ))}
      </div>

      {(!files.length || multiple) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Paperclip className="h-3.5 w-3.5 mr-1" />}
          {uploading ? 'Uploading…' : 'Attach file'}
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={e => handleFiles(e.target.files)}
        aria-hidden
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
