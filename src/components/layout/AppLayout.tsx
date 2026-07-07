import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { CalendarCheck, ListTodo, Salad, LogOut } from 'lucide-react'
import { useSession } from '@/features/auth/SessionContext'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { OfflineBanner } from '@/components/ui/offline-banner'
import { OfflineSync } from './OfflineSync'

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
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 border-b bg-white/95 backdrop-blur shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <span className="text-primary-foreground font-bold text-xs tracking-tight">A</span>
          </div>
          <span className="font-semibold text-[15px] text-foreground">Atlas</span>
        </div>
        <button
          onClick={handleLogout}
          className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      <nav aria-label="Main navigation" className="fixed bottom-0 inset-x-0 h-16 border-t bg-white/95 backdrop-blur z-10 shadow-[0_-1px_0_rgba(0,0,0,0.06)]">
        <div className="flex h-full">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} aria-hidden="true" />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
