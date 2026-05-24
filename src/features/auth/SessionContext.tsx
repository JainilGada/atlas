import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import { createAuthedClient, type SupabaseClient } from '@/lib/supabase'

const SESSION_KEY = 'atlas_jwt'
const USER_KEY = 'atlas_user_id'

interface Session {
  jwt: string
  userId: string
  db: SupabaseClient
}

interface SessionContextValue {
  session: Session | null
  login: (jwt: string, userId: string) => void
  logout: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

function loadSession(): Session | null {
  const jwt = localStorage.getItem(SESSION_KEY)
  const userId = localStorage.getItem(USER_KEY)
  if (!jwt || !userId) return null

  // Basic expiry check without a full JWT library on the client
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1]))
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(USER_KEY)
      return null
    }
  } catch {
    return null
  }

  return { jwt, userId, db: createAuthedClient(jwt) }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession)

  const login = useCallback((jwt: string, userId: string) => {
    localStorage.setItem(SESSION_KEY, jwt)
    localStorage.setItem(USER_KEY, userId)
    setSession({ jwt, userId, db: createAuthedClient(jwt) })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(USER_KEY)
    setSession(null)
  }, [])

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}

// Convenience hook — throws if not authenticated (use inside AuthGuard only)
export function useRequiredSession(): Session {
  const { session } = useSession()
  if (!session) throw new Error('No session')
  return session
}
