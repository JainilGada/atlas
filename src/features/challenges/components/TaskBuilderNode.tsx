import { useState, useRef } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { OUTPUT_TYPE_LABELS, type OutputType, type TaskNode } from '@/lib/types'

interface TaskBuilderNodeProps {
  node: TaskNode
  siblings: TaskNode[]
  isFirst: boolean
  isLast: boolean
  onUpdate: (id: string, field: 'title' | 'output_type' | 'required', value: string | boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAddChild: (parentId: string, parentDepth: number, siblingCount: number) => Promise<void>
  onMoveUp: (node: TaskNode, siblings: TaskNode[]) => Promise<void>
  onMoveDown: (node: TaskNode, siblings: TaskNode[]) => Promise<void>
}

export function TaskBuilderNode({
  node,
  siblings,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onAddChild,
  onMoveUp,
  onMoveDown,
}: TaskBuilderNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const [title, setTitle] = useState(node.title)
  const titleRef = useRef(node.title)

  async function handleTitleBlur() {
    const newTitle = title.trim()
    if (newTitle && newTitle !== titleRef.current) {
      titleRef.current = newTitle
      await onUpdate(node.id, 'title', newTitle)
    }
  }

  const indent = node.depth * 16

  return (
    <div>
      <div
        className="group flex items-center gap-2 py-2.5 px-3 hover:bg-[#F9FAFB] transition-colors"
        style={{ paddingLeft: `${indent + 12}px` }}
      >
        {/* Expand/collapse children */}
        <button
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(e => !e)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {node.children.length > 0 ? (
            expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <span className="h-3.5 w-3.5 block" />
          )}
        </button>

        {/* Title */}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="flex-1 min-w-0 text-sm text-foreground bg-transparent border-0 outline-none placeholder:text-muted-foreground focus:bg-white focus:border focus:border-primary/30 focus:rounded-lg focus:px-2 transition-all py-0.5"
          placeholder="Task title"
        />

        {/* Output type */}
        <select
          value={node.output_type}
          onChange={e => onUpdate(node.id, 'output_type', e.target.value)}
          className="text-xs text-foreground bg-[#F3F4F6] border-0 rounded-lg px-2 py-1 shrink-0 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
        >
          {(Object.entries(OUTPUT_TYPE_LABELS) as [OutputType, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        {/* Required toggle */}
        <button
          onClick={() => onUpdate(node.id, 'required', !node.required)}
          className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full transition-all ${
            node.required
              ? 'bg-primary text-primary-foreground'
              : 'bg-[#F3F4F6] text-muted-foreground hover:bg-secondary hover:text-primary'
          }`}
          title="Toggle required"
        >
          Req
        </button>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onMoveUp(node, siblings)}
            disabled={isFirst}
            className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-all"
            aria-label="Move up"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            onClick={() => onMoveDown(node, siblings)}
            disabled={isLast}
            className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-all"
            aria-label="Move down"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
          <button
            onClick={() => onAddChild(node.id, node.depth, node.children.length)}
            className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-secondary transition-all"
            aria-label="Add subtask"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            onClick={() => { if (confirm('Delete this task and all its subtasks?')) onDelete(node.id) }}
            className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            aria-label="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child, i) => (
            <TaskBuilderNode
              key={child.id}
              node={child}
              siblings={node.children}
              isFirst={i === 0}
              isLast={i === node.children.length - 1}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          ))}
        </div>
      )}
    </div>
  )
}
