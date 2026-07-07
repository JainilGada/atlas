import { useState } from 'react'
import { Plus, Trash2, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { computeKcal } from '@/lib/api/nutrition'
import type { FoodNode as FN, FoodItem, MealSlot, UserProfile } from '@/lib/types'

interface FoodNodeProps {
  node: FN
  allFlat: FoodItem[]
  slot: MealSlot
  dayLogId: string
  userId: string
  date: string
  profile: UserProfile | null
  onEstimate: (id: string) => Promise<void>
  onKcalOverride: (id: string, kcal: number) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAddChild: (parentId: string, slot: MealSlot, siblingCount: number) => Promise<void>
  estimating: Set<string>
  depth?: number
}

export function FoodNode({
  node, slot, onEstimate, onKcalOverride, onDelete, onAddChild, estimating, depth = 0,
}: FoodNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const [editingKcal, setEditingKcal] = useState(false)
  const [kcalInput, setKcalInput] = useState('')

  const isLeaf = node.children.length === 0
  const displayKcal = isLeaf ? (node.kcal ?? 0) : computeKcal(node)
  const isEstimating = estimating.has(node.id)

  function startKcalEdit() {
    setKcalInput(String(node.kcal ?? ''))
    setEditingKcal(true)
  }

  async function commitKcalEdit() {
    const n = parseFloat(kcalInput)
    if (!isNaN(n) && n >= 0) await onKcalOverride(node.id, n)
    setEditingKcal(false)
  }

  const kcalBadgeClass = isLeaf
    ? node.kcal_source === 'user_override'
      ? 'bg-blue-100 text-blue-700 cursor-pointer'
      : node.kcal != null
        ? 'bg-muted text-muted-foreground cursor-pointer hover:bg-accent'
        : 'bg-muted text-muted-foreground/50 cursor-pointer'
    : 'bg-muted text-foreground cursor-default'

  return (
    <div>
      <div
        className="group flex items-center gap-2 py-2.5 px-3 hover:bg-[#F9FAFB] transition-colors"
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        {/* Expand/collapse */}
        {node.children.length > 0 ? (
          <button onClick={() => setExpanded(e => !e)} className="shrink-0 text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : <span className="h-3.5 w-3.5 shrink-0 block" />}

        {/* Name + quantity */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground">{node.name}</span>
          {node.quantity_hint && (
            <span className="text-xs text-muted-foreground ml-1.5">{node.quantity_hint}</span>
          )}
        </div>

        {/* Kcal badge */}
        <div className="shrink-0">
          {isEstimating ? (
            <Spinner className="h-4 w-4 text-muted-foreground" />
          ) : editingKcal ? (
            <input
              autoFocus
              type="number"
              value={kcalInput}
              onChange={e => setKcalInput(e.target.value)}
              onBlur={commitKcalEdit}
              onKeyDown={e => { if (e.key === 'Enter') commitKcalEdit() }}
              className="h-6 w-20 text-xs px-1.5 rounded border border-border bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          ) : (
            <button
              onClick={isLeaf ? startKcalEdit : undefined}
              title={isLeaf ? 'Click to override' : 'Computed from children'}
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${kcalBadgeClass}`}
            >
              {displayKcal} kcal
            </button>
          )}
        </div>

        {/* Actions — always visible on mobile, fade-in on desktop hover */}
        <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
          {isLeaf && (
            <button
              onClick={() => onEstimate(node.id)}
              disabled={isEstimating}
              title="Re-estimate calories"
              className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-secondary transition-all disabled:opacity-30"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => onAddChild(node.id, slot, node.children.length)}
            title="Add sub-item"
            className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-secondary transition-all"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            onClick={() => { if (confirm('Delete this item?')) onDelete(node.id) }}
            title="Delete"
            className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {expanded && node.children.map(child => (
        <FoodNode
          key={child.id}
          node={child}
          allFlat={[]}
          slot={slot}
          dayLogId={node.day_log_id}
          userId={node.user_id}
          date=""
          profile={null}
          onEstimate={onEstimate}
          onKcalOverride={onKcalOverride}
          onDelete={onDelete}
          onAddChild={onAddChild}
          estimating={estimating}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}
