import { useEffect } from 'react'
import { flushQueue } from '@/hooks/useOfflineQueue'
import type { SupabaseClient } from '@/lib/supabase'

interface OfflineSyncProps {
  db: SupabaseClient
}

export function OfflineSync({ db }: OfflineSyncProps) {
  useEffect(() => {
    async function handleOnline() {
      try {
        await flushQueue(db)
      } catch (err) {
        console.warn('[OfflineSync] Flush failed:', err)
      }
    }

    window.addEventListener('online', handleOnline)
    // Also attempt flush on mount in case we came back online while navigating
    if (navigator.onLine) handleOnline()

    return () => window.removeEventListener('online', handleOnline)
  }, [db])

  return null
}
