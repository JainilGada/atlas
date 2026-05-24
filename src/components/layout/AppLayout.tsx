import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { CalendarCheck, ListTodo, Salad, LogOut } from 'lucide-react'
import { useSession } from '@/features/auth/SessionContext'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { OfflineBanner } from '@/components/ui/offline-banner'
import { OfflineSync } from './OfflineSync'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/checkin', label: 'Today', icon: CalendarCheck },
  { to: '/challenges', label: 'Challenges', icon: ListTodo },
  { to: '/nutrition', label: 'Nutrition', icon: Salad },
]

export function AppLayout() {
  const { logout, session } = useSession()
  const navigate = useNavigate()
  const online = useOnlineStatus()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1.5 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:text-sm"
      >
        Skip to content
      </a>

      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 h-12 border-b bg-background/95 backdrop-blur">
        <span className="font-semibold text-sm tracking-wide">Atlas</span>
        <button
          onClick={handleLogout}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      {/* Offline banner */}
      {!online && <OfflineBanner />}

      {/* Flush queue when back online */}
      {session && <OfflineSync db={session.db} />}

      {/* Page content */}
      <main id="main-content" role="main" className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav aria-label="Main navigation" className="fixed bottom-0 inset-x-0 h-16 border-t bg-background/95 backdrop-blur z-10">
        <div className="flex h-full">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
