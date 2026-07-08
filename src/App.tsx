import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { SessionProvider } from './features/auth/SessionContext'
import { ErrorBoundary } from './components/ui/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </ErrorBoundary>
  )
}
