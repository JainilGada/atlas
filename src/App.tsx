import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { SessionProvider } from './features/auth/SessionContext'

export default function App() {
  return (
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  )
}
