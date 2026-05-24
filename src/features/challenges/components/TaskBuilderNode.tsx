import { useState, useRef } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
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

  const indent = node.depth * 20

  return (
    <div>
      <div
        className="group flex items-center gap-2 py-2 px-2 rounded-md hover:bg-muted/50 transition-colors"
        style={{ paddingLeft: `${indent + 8}px` }}
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
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="h-7 text-sm flex-1 min-w-0 border-transparent shadow-none focus-visible:border-input focus-visible:shadow-sm px-1"
          placeholder="Task title"
        />

        {/* Output type */}
        <Select
          value={node.output_type}
          onValueChange={v => onUpdate(node.id, 'output_type', v)}
        >
          <SelectTrigger className="h-7 text-xs w-36 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(OUTPUT_TYPE_LABELS) as [OutputType, string][]).map(([v, l]) => (
              <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Required toggle */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted-foreground hidden sm:inline">Req</span>
          <Switch
            checked={node.required}
            onCheckedChange={v => onUpdate(node.id, 'required', v)}
            className="h-4 w-7 data-[state=checked]:bg-primary"
          />
        </div>

        {/* Actions — always visible on touch (no hover), reveal on hover on pointer devices */}
        <div className="flex items-center gap-0.5 [@media(hover:none)]:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost" size="icon" className="h-6 w-6"
            onClick={() => onMoveUp(node, siblings)}
            disabled={isFirst}
            aria-label="Move up"
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-6 w-6"
            onClick={() => onMoveDown(node, siblings)}
            disabled={isLast}
            aria-label="Move down"
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-6 w-6"
            onClick={() => onAddChild(node.id, node.depth, node.children.length)}
            aria-label="Add subtask"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-6 w-6 hover:text-destructive"
            onClick={() => { if (confirm('Delete this task and all its subtasks?')) onDelete(node.id) }}
            aria-label="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
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
