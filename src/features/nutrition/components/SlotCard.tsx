import { useState, type FormEvent } from 'react'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { FoodNode } from './FoodNode'
import { buildFoodTree, totalSlotKcal, createFoodItem, updateFoodItem, softDeleteFoodItem } from '@/lib/api/nutrition'
import type { FoodItem, MealSlot, UserProfile } from '@/lib/types'
import type { SupabaseClient } from '@/lib/supabase'

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  morning_snack: 'Morning Snack',
  lunch: 'Lunch',
  evening_snack: 'Evening Snack',
  dinner: 'Dinner',
  late_night: 'Late Night',
}

interface SlotCardProps {
  slot: MealSlot
  items: FoodItem[]
  dayLogId: string
  userId: string
  date: string
  db: SupabaseClient
  profile: UserProfile | null
  onItemsChange: (slot: MealSlot, items: FoodItem[]) => void
}

export function SlotCard({ slot, items, dayLogId, userId, date, db, profile, onItemsChange }: SlotCardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addQty, setAddQty] = useState('')
  const [adding, setAdding] = useState(false)
  const [estimating, setEstimating] = useState<Set<string>>(new Set())

  const slotItems = items.filter(f => f.slot === slot)
  const tree = buildFoodTree(slotItems)
  const totalKcal = totalSlotKcal(tree)

  function update(updated: FoodItem[]) {
    const others = items.filter(f => f.slot !== slot)
    onItemsChange(slot, [...others, ...updated])
  }

  async function estimate(itemId: string, item?: FoodItem, currentItems: FoodItem[] = items) {
    const target = item ?? currentItems.find(f => f.id === itemId)
    if (!target) return
    setEstimating(prev => new Set(prev).add(itemId))
    try {
      const { data, error } = await db.functions.invoke('ai-estimate', {
        body: {
          item: { name: target.name, quantityHint: target.quantity_hint },
          profile,
        },
      })
      if (error) throw error
      const kcal = (data as { kcal: number }).kcal
      await updateFoodItem(db, itemId, { kcal, kcal_source: 'ai_estimated' })
      update(currentItems.map(f => f.id === itemId ? { ...f, kcal, kcal_source: 'ai_estimated' } : f))
    } catch (e) {
      console.error('AI estimate failed', e)
    } finally {
      setEstimating(prev => { const s = new Set(prev); s.delete(itemId); return s })
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!addName.trim()) return
    setAdding(true)
    try {
      const newItem = await createFoodItem(db, {
        day_log_id: dayLogId,
        user_id: userId,
        slot,
        name: addName.trim(),
        quantity_hint: addQty.trim() || undefined,
        sort_order: slotItems.length,
      })
      const updated = [...items, newItem]
      update(updated)
      setAddName('')
      setAddQty('')
      setShowAdd(false)
      estimate(newItem.id, newItem, updated)
    } finally {
      setAdding(false)
    }
  }

  async function handleKcalOverride(id: string, kcal: number) {
    await updateFoodItem(db, id, { kcal, kcal_source: 'user_override' })
    update(items.map(f => f.id === id ? { ...f, kcal, kcal_source: 'user_override' } : f))
  }

  async function handleDelete(id: string) {
    const getDesc = (itemId: string): string[] => {
      const children = items.filter(f => f.parent_id === itemId).map(f => f.id)
      return [...children, ...children.flatMap(getDesc)]
    }
    const toDelete = [id, ...getDesc(id)]
    await Promise.all(toDelete.map(tid => softDeleteFoodItem(db, tid, userId)))
    update(items.filter(f => !toDelete.includes(f.id)))
  }

  async function handleAddChild(parentId: string, _slot: MealSlot, siblingCount: number) {
    const parent = items.find(f => f.id === parentId)
    if (!parent) return
    const newItem = await createFoodItem(db, {
      day_log_id: dayLogId,
      user_id: userId,
      slot,
      name: 'New item',
      parent_id: parentId,
      sort_order: siblingCount,
    })
    const updated = [...items, newItem]
    update(updated)
    estimate(newItem.id, newItem, updated)
  }

  return (
    <div
      className="bg-white rounded-xl overflow-hidden"
      style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
    >
      {/* Header */}
      <button
        className="flex items-center justify-between w-full px-4 py-3"
        onClick={() => setCollapsed(c => !c)}
      >
        <span className="font-semibold text-sm text-foreground">{SLOT_LABELS[slot]}</span>
        <div className="flex items-center gap-2">
          {totalKcal > 0 && (
            <span className="text-xs font-medium text-primary bg-secondary px-2 py-0.5 rounded-full">
              {totalKcal} kcal
            </span>
          )}
          {collapsed
            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
            : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {!collapsed && (
        <>
          {tree.length > 0 && (
            <div className="border-t divide-y divide-[#F3F4F6]">
              {tree.map(node => (
                <FoodNode
                  key={node.id}
                  node={node}
                  allFlat={slotItems}
                  slot={slot}
                  dayLogId={dayLogId}
                  userId={userId}
                  date={date}
                  profile={profile}
                  onEstimate={estimate}
                  onKcalOverride={handleKcalOverride}
                  onDelete={handleDelete}
                  onAddChild={handleAddChild}
                  estimating={estimating}
                />
              ))}
            </div>
          )}

          <div className="px-3 py-2 border-t border-[#F3F4F6]">
            {showAdd ? (
              <form onSubmit={handleAdd} className="flex gap-2 items-center">
                <input
                  autoFocus
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="Food name"
                  disabled={adding}
                  className="flex-1 h-8 text-sm text-foreground bg-white border border-border rounded-lg px-2.5 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                />
                <input
                  value={addQty}
                  onChange={e => setAddQty(e.target.value)}
                  placeholder="Qty"
                  disabled={adding}
                  className="w-20 h-8 text-sm text-foreground bg-white border border-border rounded-lg px-2.5 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={adding || !addName.trim()}
                  className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center"
                >
                  {adding ? <Spinner className="h-3.5 w-3.5" /> : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="h-8 px-3 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-all"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 transition-opacity py-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add food
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
