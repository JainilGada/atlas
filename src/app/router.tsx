import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/features/auth/AuthGuard'
import { AppLayout } from '@/components/layout/AppLayout'
import LoginPage from '@/features/auth/LoginPage'
import ChallengesPage from '@/features/challenges/ChallengesPage'
import ChallengeSetupPage from '@/features/challenges/ChallengeSetupPage'
import CheckinPage from '@/features/checkin/CheckinPage'
import NutritionPage from '@/features/nutrition/NutritionPage'
import NutritionSettingsPage from '@/features/settings/NutritionSettingsPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/today', element: <Navigate to="/checkin" replace /> },

  {
    element: <AuthGuard><AppLayout /></AuthGuard>,
    children: [
      { path: '/', element: <Navigate to="/checkin" replace /> },
      { path: '/checkin', element: <CheckinPage /> },
      { path: '/challenges', element: <ChallengesPage /> },
      { path: '/challenges/:id/setup', element: <ChallengeSetupPage /> },
      { path: '/nutrition', element: <NutritionPage /> },
      { path: '/settings/nutrition', element: <NutritionSettingsPage /> },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])
