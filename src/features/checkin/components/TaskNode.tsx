import { useState } from 'react'
import { ChevronDown, ChevronRight, MessageSquare, CheckCircle2, Circle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { YesNoInput } from './inputs/YesNoInput'
import { ShortTextInput } from './inputs/ShortTextInput'
import { LongTextInput } from './inputs/LongTextInput'
import { NumberInput } from './inputs/NumberInput'
import { FileInput } from './inputs/FileInput'
import { upsertTaskEntry } from '@/lib/api/checkins'
import { enqueueOp } from '@/hooks/useOfflineQueue'
import type { Task, TaskNode as TN, TaskEntry } from '@/lib/types'
import type { SupabaseClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

function isComplete(entry: TaskEntry | undefined, outputType: Task['output_type']): boolean {
  if (!entry) return false
  if (outputType === 'yes_no') return entry.value_bool === true
  if (outputType === 'number') return entry.value_number != null
  if (['single_photo', 'multiple_photos', 'single_file', 'multiple_files'].includes(outputType))
    return Array.isArray(entry.value_files) && entry.value_files.length > 0
  return (entry.value_text ?? '').length > 0
}

interface TaskNodeProps {
  node: TN
  allFlat: Task[]
  checkinId: string
  userId: string
  date: string
  db: SupabaseClient
  entries: Record<string, TaskEntry>
  onEntryChange: (taskId: string, entry: TaskEntry) => void
  depth?: number
}

export function TaskNode({
  node, allFlat, checkinId, userId, date, db, entries, onEntryChange, depth = 0,
}: TaskNodeProps) {
  const [childrenOpen, setChildrenOpen] = useState(true)
  const [commentOpen, setCommentOpen] = useState(false)
  const [comment, setComment] = useState(entries[node.id]?.comment ?? '')
  const [saving, setSaving] = useState(false)

  const entry = entries[node.id]
  const complete = isComplete(entry, node.output_type)
  const hasChildren = node.children.length > 0

  async function save(patch: Partial<Omit<TaskEntry, 'id' | 'created_at' | 'updated_at'>>) {
    setSaving(true)
    const payload = {
      checkin_id: checkinId,
      task_id: node.id,
      user_id: userId,
      date,
      value_bool: entry?.value_bool ?? null,
      value_text: entry?.value_text ?? null,
      value_number: entry?.value_number ?? null,
      value_files: entry?.value_files ?? null,
      comment: entry?.comment ?? null,
      ...patch,
    }
    // Optimistic update so the UI feels instant
    const optimistic: TaskEntry = { id: entry?.id ?? '', created_at: '', updated_at: '', ...payload } as TaskEntry
    onEntryChange(node.id, optimistic)
    try {
      const updated = await upsertTaskEntry(db, payload)
      onEntryChange(node.id, updated)
      // Propagate parent completion
      await propagate(node.id, { ...entries, [node.id]: updated })
    } catch (err) {
      // Network error — enqueue for later replay
      if (!navigator.onLine) {
        await enqueueOp({
          table: 'task_entries',
          operation: 'upsert',
          data: payload as Record<string, unknown>,
          onConflict: 'checkin_id,task_id',
        })
      } else {
        throw err
      }
    } finally {
      setSaving(false)
    }
  }

  async function propagate(taskId: string, currentEntries: Record<string, TaskEntry>) {
    const task = allFlat.find(t => t.id === taskId)
    if (!task?.parent_id) return
    const parent = allFlat.find(t => t.id === task.parent_id)
    if (!parent) return
    const requiredSiblings = allFlat.filter(t => t.parent_id === parent.id && t.required)
    const allDone = requiredSiblings.every(s => isComplete(currentEntries[s.id], s.output_type))
    if (allDone) {
      const parentUpdated = await upsertTaskEntry(db, {
        checkin_id: checkinId,
        task_id: parent.id,
        user_id: userId,
        date,
        value_bool: true,
        value_text: currentEntries[parent.id]?.value_text ?? null,
        value_number: currentEntries[parent.id]?.value_number ?? null,
        value_files: currentEntries[parent.id]?.value_files ?? null,
        comment: currentEntries[parent.id]?.comment ?? null,
      })
      onEntryChange(parent.id, parentUpdated)
      await propagate(parent.id, { ...currentEntries, [parent.id]: parentUpdated })
    }
  }

  async function saveComment() {
    await save({ comment: comment || null })
  }

  const indent = depth * 16

  return (
    <div>
      <div
        className={cn(
          'group border-b last:border-b-0 transition-colors',
          complete ? 'bg-green-50/50 dark:bg-green-950/20' : '',
        )}
        style={{ paddingLeft: `${indent}px` }}
      >
        <div className="flex items-start gap-3 py-3 px-3">
          {/* Completion indicator */}
          <div className="shrink-0 mt-0.5 text-muted-foreground">
            {complete
              ? <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              : <Circle className="h-5 w-5" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className={cn('text-sm font-medium', complete && 'line-through text-muted-foreground')}>
                {node.title}
              </span>
              {!node.required && (
                <span className="text-xs text-muted-foreground">(optional)</span>
              )}
              {hasChildren && (
                <button
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  onClick={() => setChildrenOpen(o => !o)}
                  aria-label={childrenOpen ? 'Collapse' : 'Expand'}
                >
                  {childrenOpen
                    ? <ChevronDown className="h-3.5 w-3.5" />
                    : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>

            {/* Input */}
            {node.output_type === 'yes_no' && (
              <YesNoInput value={entry?.value_bool ?? null} onChange={v => save({ value_bool: v })} disabled={saving} />
            )}
            {node.output_type === 'short_text' && (
              <ShortTextInput value={entry?.value_text ?? null} onBlurSave={v => save({ value_text: v || null })} disabled={saving} />
            )}
            {node.output_type === 'long_text' && (
              <LongTextInput value={entry?.value_text ?? null} onBlurSave={v => save({ value_text: v || null })} disabled={saving} />
            )}
            {node.output_type === 'number' && (
              <NumberInput value={entry?.value_number ?? null} onBlurSave={v => save({ value_number: v })} disabled={saving} />
            )}
            {(node.output_type === 'single_photo' || node.output_type === 'multiple_photos') && (
              <FileInput
                files={entry?.value_files ?? []}
                multiple={node.output_type === 'multiple_photos'}
                accept="image/jpeg,image/png,image/heic,image/webp"
                db={db} userId={userId} date={date} taskId={node.id}
                onChange={files => save({ value_files: files })}
                disabled={saving}
              />
            )}
            {(node.output_type === 'single_file' || node.output_type === 'multiple_files') && (
              <FileInput
                files={entry?.value_files ?? []}
                multiple={node.output_type === 'multiple_files'}
                accept="image/jpeg,image/png,image/heic,image/webp,application/pdf,video/mp4"
                db={db} userId={userId} date={date} taskId={node.id}
                onChange={files => save({ value_files: files })}
                disabled={saving}
              />
            )}

            {/* Comment toggle */}
            <button
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              onClick={() => setCommentOpen(o => !o)}
            >
              <MessageSquare className="h-3 w-3" />
              {entry?.comment ? 'Edit comment' : 'Add comment'}
            </button>

            {commentOpen && (
              <div className="space-y-1.5">
                <Textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  onBlur={saveComment}
                  rows={2}
                  placeholder="Comment…"
                  className="text-xs resize-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Children */}
      {hasChildren && childrenOpen && (
        <div>
          {node.children.map(child => (
            <TaskNode
              key={child.id}
              node={child}
              allFlat={allFlat}
              checkinId={checkinId}
              userId={userId}
              date={date}
              db={db}
              entries={entries}
              onEntryChange={onEntryChange}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
